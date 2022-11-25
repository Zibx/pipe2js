#!/usr/bin/env node

var fnFactory = function(processFn, nextFn, finishFn){
	return function(){
		currentProcessor = new Processor();
		currentProcessor.fn = this.step;
		pipeline.push(currentProcessor);

		while(true){
			var arg = getArg();

			if(arg === void 0)
				arg = 'a';

			if(arg in keys) {
				if(keys[arg].primary) {
					returnArg();
					arg = 'a';
				}
			}

			if(arg in keys){
				keys[arg].fn(currentProcessor);
			}else{
				if(processFn) {
					currentProcessor.fn = processFn.call( currentProcessor, arg );
				}
				currentProcessor.next = nextFn;
				currentProcessor.finishFn = finishFn;
				break;
			}
		}
	}
};

var callNext = function(pipelineCursor){
	if(pipelineCursor < pipeline.length) {
		pipeline[ pipelineCursor + 1 ].consume( this.current, pipelineCursor+1 );
	}
};

var codeDecorator = function(fn){
	return function(currentProcessor) {
		currentProcessor.decorators.push( fn );
	}
};
/*

var JSONselect = require('JSONSelect');
var f = [];
var x = JSONselect.match('.prop1', f,[{a: 2}, {prop1: 4}])
debugger
*/

var keys = {
	'--flat': {
		alias: '-flat',
		primary: true,
		description: 'convert array to separate items',
		fn: fnFactory(function(code){
			return bypass;
		}, function(pipelineCursor){
			if(pipelineCursor < pipeline.length) {
				if('length' in this.current){
					for(var i = 0, _i = this.current.length; i < _i; i++){
						pipeline[ pipelineCursor + 1 ].consume( this.current[i], pipelineCursor+1 );
					}
				}
			}
		})

	},
	'--json': {
		alias: '-j',
		description: 'convert JSON String to an Object. Attention: JSON is not parsing as stream, so initial string is fully placed in memory',
		moreDescription: `
Usage Example:
1. Get package version 
cat package.json | pipe2js -j -m 'obj.version'

2. We have got an array of objects, list only ids of objects that have amount=10. Objects looks like: { id: '10p-n-1wu', amount: 5, win: true }
cat tickets.json | pipe2js -j --flat -f "obj.amount===10" -m -t '$\{obj.win?"+":"-"}$\{obj.id}'
`,
		fn: fnFactory(function(code){
			this.exp = code;
			return new Function('', 'return (a, b, i, total, line, obj)=>i>0?b+"\\n"+a:a')();
		}, function(pipelineCursor) {

		}, function(pipelineCursor){
			try {
				var obj = JSON.parse( this.current );
			}catch( e ){
				console.error(e);
				process.exit(1);
			}

			pipeline[ pipelineCursor + 1 ].consume( obj, pipelineCursor+1 );
		})
	},
	'--contain': {
		description: 'check if line contains string',
		alias: '-c',
		fn: codeDecorator(function(code){
		    return 'line.indexOf( `'+code+'` )>-1'
		})
	},
	'--regexp': {
		description: 'use regexp to filter',
		alias: '-x',
		fn: codeDecorator(function(code){
			return 'line.match( /'+code+'/ )!==null'
		})
	},
	'--map': {
		primary: true,
		alias: '-m',
		description: 'map data. if combined with -n - would input numbers',
		moreDescription: `
Avaliable Variables: 
  \`line\`, \`a\`, \`obj\` - current item
  \`previous\`         - previously processed item
  \`i\`                - line number
  \'total\`            - total number of consumed lines
  
Usage Example:

1. Customize output by mapping with template
> ping 8.8.8.8 | pipe2js -f -x '^64 ' -m -t '$\{i+1}) $\{line.split("time=")[1]}'
1) 68.7 ms
2) 68.4 ms

2. Generating some sequence (0 1 3 6 10 15 ...) 
> ping 8.8.8.8 | pipe2js -m 'i+previous|0'`,
		fn: fnFactory(function(code){
			return new Function('', 'return (line, previous, i, total, a, obj)=>(\n'+this.decorate(code)+'\n)')();
		}, callNext)
	},
	'--reduce': {
		primary: true,
		description: 'reduce given items. Great for calculating sum',
		moreDescription: `
Avaliable Variables: 
  \`a\` - current item
  \`b\` - current item
  \`i\`         - line number
  \'total\`     - total number of consumed lines
  
Usage Example:

1. Calculate pings count
> ping 8.8.8.8 | pipe2js -m '1' -r 'a+b'

2. Generating some sequence (0 1 3 6 10 15 ...) 
> ping 8.8.8.8 | pipe2js -m 'i+previous|0'`,
		alias: '-r',
		fn: fnFactory(function(code){
			return new Function('', 'return (a, b, i, total)=>i>0?(\n'+this.decorate(code)+'\n):a')();
		}, function(pipelineCursor) {

		}, callNext)
	},
	'--number': {
		alias: '-n',
		description: 'convert input to number. Operates with string may cause concat instead of sum',
		fn: function(processor){
			processor.preprocess.push(parseFloat);
		}
	},
	'--tpl': {
		alias: '-t',
		description: 'code is a template',
		moreDescription: `
ping 8.8.8.8 | pipe2js -m 'line.split("time=")[1]' -f -n -r "a+b" -m -t 'sum: $\{a}, total: $\{total}, avg: $\{a/total}'`,
		fn: codeDecorator(function(code){
			return '`'+code+'`'
		})
	},
	'--filter': {
		primary: true,
		alias: '-f',
		description: 'filter data with your condition. can be combined with -c and -x',
		moreDescription: `
Avaliable Variables: 
  \`line\`, \`a\`, \`obj\` - current item
  \`previous\`         - previously processed item
  \`i\`                - item number
  \'total\`            - total number of consumed lines
  
Usage Example:
  ping 8.8.8.8 | pipe2js -f 'parseInt(line.split("icmp_seq=")[1])>2'
  ping 8.8.8.8 | pipe2js -f -c '3'`,
		fn: fnFactory(function(code){
			return new Function('', 'return (line, previous, i, total, a, obj)=>(\n'+this.decorate(code)+'\n)')();
		}, function(pipelineCursor){
			if(this.current && pipelineCursor < pipeline.length) {
				pipeline[ pipelineCursor + 1 ].consume( this.processed, pipelineCursor+1 );
			}
		})
	},
	'--version': {
		alias: '-v',
		description: 'display version of and exit',
		fn: function() {
			console.log('v'+JSON.parse(require('fs').readFileSync('package.json')).version);
			process.exit(0);
		}
	},
	'--help': {
		description: 'display this help and exit',
		alias: '-h',
		fn: function(){
		    console.log(
`Usage: cat [FILE] | pipe2js [OPTION]...
Use javaScript flavor to Map, Filter, Reduce standard input to standard output. This tool use stream and can process huge files.

Options:
${helpKeys.map(key => {
	var pad = function(count, symbol){
	    return count > 0 ? new Array(count+1).join(symbol) : ''; 
	};
	var param = keys[key];
	var prop = `${param.alias?param.alias+',': '   '} ${key}`;
	
	return `  ${prop}${pad(16-prop.length, ' ')}${param.description}${
		param.moreDescription? '\n'+param.moreDescription.split('\n').map(a=>pad(18,' ')+a).join('\n')+'\n': '' 
	}`
}).join('\n')}

You can use any count of maps, filters. and reduces

Examples:
  1. To calculate how many prizes were won from log where wins looks like:
    2022-10-22 11:58:11 [xq1z5bbcvy] → win TYPE:10 ID:060#BUEP TIME:12.969
    
  Find all rows containing 'win ', 
    split by type and get the second part, 
    convert results to numbers, 
    sum it up:
    
  cat log.log | pipe2js -f -c 'win ' -m 'a.split("TYPE:")[1]' -m -n -r 'a+b'
  
`);
			process.exit(0);
		}
	}
};
var helpKeys = Object.keys(keys).sort();

// aliases
helpKeys.forEach(function(key){
	var param = keys[key];
	param.name = key;
	if(param.alias){
		keys[param.alias] = param;
	}
});

var currentArgPointer = 2,
	argCount = process.argv.length;

var returnArg = function(){
	currentArgPointer--;
}
var getArg = function(){
    return process.argv[currentArgPointer++];
};

var bypass = a => a;
var total = 0;

var Processor = function(consume){
    this.preprocess = [];
	this.postprocess = [];
	this.decorators = [];
	this.cursor = 0;
	this.fn = bypass;
	consume && (this.consume = consume);
};
Processor.prototype = {
	fn: bypass,
	consume: function(line, pipelineCursor){
	  var processed = this.preprocess.reduce(function(val, fn){
	      return fn(val);
	  }, line);
	  this.previous = this.current;
	  this.processed = processed;
	  this.current = this.fn(processed, this.previous, this.cursor, total, processed, processed);

	  this.current = this.postprocess.reduce(function(val, fn){
			return fn(val);
	  }, this.current);

	  this.next(pipelineCursor);
      this.cursor++;
	},
	finish: function(pipelineCursor){
	    if(this.finishFn)
			this.finishFn(pipelineCursor);
		else{
			if( pipelineCursor < pipeline.length -  1 ) {
				pipeline[ pipelineCursor + 1 ].finish( pipelineCursor + 1 );
			}
		}
	},
	decorate: function(code){
	    return this.decorators.reduce(function(code, fn){
	        return fn(code);
	    }, code)
	}
};


var currentProcessor,
	pipeline = [];

while( currentArgPointer < argCount ){
	var arg = getArg();
	if(arg in keys){
		keys[arg].fn();
	}else{
		console.error(`Unknown parameter ${arg}`);
		process.exit(1);
	}
}


pipeline.push(new Processor(function(line){
	console.log(line);
		/*process.stdout.write(line);*/
}))

/*var code = process.argv.slice(2).join(' ');
console.log(process.argv)*/
//var fn = new Function('', 'return (line, i)=>(\n'+code+'\n)')();

const DEBUG = false;
if(DEBUG) {
	var fs = require( 'fs' );
	var data = fs.readFileSync( 'test/filterData.log' ).toString().split( /\r\n|\n/ );
	/*var data = fs.readFileSync('test/testData.log').toString().split(/\r\n|\n/);*/
	data.forEach( function( line ) {
		pipeline[ 0 ].consume( line, 0 );
	} );
	pipeline[ 0 ].finish( 0 );

	process.exit( 0 )
}
const readline = require('readline');
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

var currentLineNumber = 0;

rl.on('line', (line) => {
	line = line.toString();
	total++;
	pipeline[0].consume(line, 0);
	//process.stdout.write(fn(line, currentLineNumber)+'\n');
	//currentLineNumber++;
});

rl.once('close', () => {
	pipeline[ 0 ].finish( 0 );

	// end of input
});

process.on('SIGINT', function() {
	pipeline[ 0 ].finish( 0 );

	//setTimeout(function(){
		process.exit();
	//}, 10);

});

/*process.stdin.on( 'end', function() { console.log( 'EOF' ) } );*/

/*process.stdin.on("data", data => {
    data = data.toString().toUpperCase()
    process.stdout.write(x++ + ')'+data + "\n")
})*/
