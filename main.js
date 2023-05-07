#!/usr/bin/env node

var StreamValues = require('stream-json/streamers/StreamValues');

var debug = function nop() {console.log.apply(console, arguments)};
var debug = function nop() {};
var fnFactory = function( processFn, nextFn, finishFn ) {
	return function(awk, args) {
		var currentProcessor = new Processor(null, awk);
		currentProcessor.fn = this.step;
		currentProcessor.name = this.name;
		currentProcessor.usedArgs = [];
		awk.pipeline.push( currentProcessor );

		while( true ) {
			var arg = args.getArg();

			if( arg === void 0 )
				arg = 'a';

			if( arg in keys ) {
				if( keys[ arg ].primary ) {
					args.returnArg();
					arg = 'a';
				}
			}
			currentProcessor.usedArgs.push(arg);

			if( arg in keys ) {
				keys[ arg ].fn( currentProcessor );
			} else {
				if( processFn ) {
					try {
						currentProcessor.fn = processFn.call( currentProcessor, arg );
					}catch( e ){
						console.error('Error parsing arguments. Syntax error. Verbose dump')
						args.parsed.forEach(function(parsed, n){
							console.error('\t'+ (n+1) + ') '+ parsed.join(' '))
						})
						console.error('\n\t'+ (args.parsed.length+1) + ') '+ this.name + ' '+ currentProcessor.usedArgs.join(' '))
						//var [, lineno, colno] = e.stack.match(/<anonymous>:(\d+):(\d+)/);
						console.error(e.message);
						process.exit(1);
						throw new Error(e.message);
					}
				}
				currentProcessor.next = nextFn;
				currentProcessor.finishFn = finishFn;
				break;
			}
		}
	}
};

var callFinish = function(pipelineCursor){
  if( pipelineCursor < this.awk.pipeline.length - 1 ) {
    this.awk.pipeline[ pipelineCursor + 1 ].finish( pipelineCursor + 1 );
  }else{
    this.awk.finished = true;
    this.awk.afterEnd && this.awk.afterEnd();
  }
}
var callNextAndFinish = function(pipelineCursor){
  callNext.call(this, pipelineCursor);
  callFinish.call(this, pipelineCursor);
};
var callNext = function( pipelineCursor ) {
	if( pipelineCursor < this.awk.pipeline.length ) {
		this.awk.pipeline[ pipelineCursor + 1 ].consume( this.current, pipelineCursor + 1 );
	}
};

var codeDecorator = function( fn ) {
	return function( currentProcessor ) {
		currentProcessor.decorators.push( fn );
	}
};
/*

var JSONselect = require('JSONSelect');
var f = [];
var x = JSONselect.match('.prop1', f,[{a: 2}, {prop1: 4}])
debugger
*/
var j=0;
var objs1 = [];
var objs2 = [];
var keys = {
	'--flat': {
		alias: '-flat',
		primary: true,
		description: 'convert array to separate items',
		fn: fnFactory( function( code ) {
			return bypass;
		}, function( pipelineCursor ) {
			if( pipelineCursor < this.awk.pipeline.length ) {
				if( 'length' in this.current ) {
					for( var i = 0, _i = this.current.length; i < _i; i++ ) {
						this.awk.pipeline[ pipelineCursor + 1 ].consume( this.current[ i ], pipelineCursor + 1 );
					}
				}
			}
		} )

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
		fn: fnFactory( function( code ) {
      this.jsonParser = StreamValues.withParser();
      var _self = this;
var x = 0;
      /*this.jsonParser.on('end', (data) => {
        console.log(';',x)
        objs1;
        objs2;
        //debugger

        //_self.awk.pipeline[ _self.pipelineCursor + 1 ].finish( _self.pipelineCursor + 1 );
      });*/
      this.jsonParser.on('end', (data) => {
        callFinish.call(_self, _self.pipelineCursor);
      });
      this.jsonParser.on('data', (data) => {
        var obj = data.value;
        /*x++;
        console.log('w;', x, obj.f)

        debug(obj)
        objs2.push(obj);*/
        _self.awk.pipeline[ _self.pipelineCursor + 1 ].consume( obj, _self.pipelineCursor + 1 );
      });
      /*this.readable = new stream.Readable();
      this.readable._read = function(a,b,c){

          debug('wtf',a,b,c)
      }*/
      //new ReadString('{"a":1}{"b":2}').pipe(this.jsonParser);
      //this.jsonParser = new parser({jsonStreaming: true, packValues: true, streamValues: false})
			this.exp = code;
      debug('init pipe to parser');
      //this.readable.pipe(this.jsonParser);
      debug('after init pipe to parser');

      return new Function( '', 'return (a, b, i, total, line, obj)=>a' )();
			//return new Function( '', 'return (a, b, i, total, line, obj)=>i>0?b+"\\n"+a:a' )();
		}, function( pipelineCursor ) {
      this.pipelineCursor = pipelineCursor;

      j++
      debug('before write to readable')
      //objs1.push(JSON.parse(this.current));
      //this.readable.push(this.current, 'utf8');

      this.jsonParser.write(this.current);
      //var rs = new ReadString(this.current);
      //rs.pipe(this.jsonParser);

      //rs.pipe(this.current);
      /*this.lastRS = rs;
      this.lastRS.cat = this.current;
      this.jsonParser.setMaxListeners(Infinity)
      var _self = this;
      rs.on('end', function(a,b,c){
        rs.unpipe(_self.jsonParser);
      })*/
		}, function( pipelineCursor ) {
//console.log(j, this.lastRS.cat)
			/*try {
				var obj = JSON.parse( this.current );
			} catch( e ) {
				console.error( e );
				process.exit( 1 );
			}*/
      debug('finish write to readable')
      //this.readable.push(null);
      this.jsonParser.end();
/*      var _self = this;
      this.lastRS.on('end', function(a,b,c){
        _self.jsonParser.end();
        callFinish.call(_self, _self.pipelineCursor);
        console.log(x);
      });*/

      //new ReadString('').pipe(this.jsonParser);
			//this.awk.pipeline[ pipelineCursor + 1 ].consume( obj, pipelineCursor + 1 );
			//this.awk.pipeline[ pipelineCursor + 1 ].finish( pipelineCursor + 1 );
		} )
	},
	'--contain': {
		description: 'check if line contains string',
		alias: '-c',
		fn: codeDecorator( function( code ) {
			return 'line.indexOf( `' + code + '` )>-1'
		} )
	},
	'--regexp': {
		description: 'use regexp to filter',
		alias: '-x',
		fn: codeDecorator( function( code ) {
			return 'line.match( /' + code + '/ )!==null'
		} )
	},
  '--keys': {
    description: 'assign array elements to named keys',
    alias: '-k',
    fn: codeDecorator( function( code ) {
      return 'Array.isArray(line) ? `'+code+'`.split(",").map(x=>x.trim()).map((key,n)=>({key, val: line[n]})).reduce((store, kv)=>{store[kv.key] = kv.val; return store}, {}) : line'
    } )
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
		fn: fnFactory( function( code ) {
			return new Function( '', 'return (line, previous, i, total, a, obj)=>(\n' + this.decorate( code ) + '\n)' )();
		}, callNext )
	},
  '--count': {
    primary: true,
    description: 'count elements',
    alias: '-C',
    fn: fnFactory( function( code ) {
      return new Function( '', 'return (a, b, i, total)=>i+1' )();
    }, function( pipelineCursor ) {

    }, callNextAndFinish )
  },
	'--reduce': {
		primary: true,
		description: 'reduce given items. Great for calculating sum',
		moreDescription: `
Avaliable Variables: 
  \`a\` - current item
  \`b\` - storage / previous item / previous reduce result
  \`i\`         - line number
  \'total\`     - total number of consumed lines
  
Usage Example:

1. Calculate pings count
> ping 8.8.8.8 | pipe2js -m '1' -r 'a+b'

2. Generating some sequence (0 1 3 6 10 15 ...) 
> ping 8.8.8.8 | pipe2js -m 'i+previous|0'`,
		alias: '-r',
		fn: fnFactory( function( code ) {
			return new Function( '', 'return (a, b, i, total)=>i>0?(\n' + this.decorate( code ) + '\n):a' )();
		}, function( pipelineCursor ) {

		}, callNextAndFinish )
	},
	'--number': {
		alias: '-n',
		description: 'convert input to number. Operates with string may cause concat instead of sum',
		fn: function( processor ) {
			processor.preprocess.push( parseFloat );
		}
	},
	'--tpl': {
		alias: '-t',
		description: 'code is a template',
		moreDescription: `
ping 8.8.8.8 | pipe2js -m 'line.split("time=")[1]' -f -n -r "a+b" -m -t 'sum: $\{a}, total: $\{total}, avg: $\{a/total}'`,
		fn: codeDecorator( function( code ) {
			return '`' + code + '`'
		} )
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
		fn: fnFactory( function( code ) {
			return new Function( '', 'return (line, previous, i, total, a, obj)=>(\n' + this.decorate( code ) + '\n)' )();
		}, function( pipelineCursor ) {
			if( this.current && pipelineCursor < this.awk.pipeline.length ) {
				this.awk.pipeline[ pipelineCursor + 1 ].consume( this.processed, pipelineCursor + 1 );
			}
		} )
	},
	'--version': {
		alias: '-v',
		description: 'display version of and exit',
		fn: function() {
			console.log( 'v' + JSON.parse( require( 'fs' ).readFileSync( 'package.json' ) ).version );
			process.exit( 0 );
		}
	},
	'--help': {
		description: 'display this help and exit',
		alias: '-h',
		fn: function() {
			console.log(
				`Usage: cat [FILE] | pipe2js [OPTION]...
Use javaScript flavor to Map, Filter, Reduce standard input to standard output. This tool use stream and can process huge files.

Options:
${helpKeys.map( key => {
	var pad = function( count, symbol ) {
		return count > 0 ? new Array( count + 1 ).join( symbol ) : '';
	};
	var param = keys[ key ];
	var prop = `${param.alias ? param.alias + ',' : '   '} ${key}`;

	return `  ${prop}${pad( 16 - prop.length, ' ' )}${param.description}${
		param.moreDescription ? '\n' + param.moreDescription.split( '\n' ).map( a => pad( 18, ' ' ) + a ).join( '\n' ) + '\n' : ''
	}`
} ).join( '\n' )}

You can use any count of maps, filters. and reduces

Examples:
  1. To calculate how many prizes were won from log where wins looks like:
    2022-10-22 11:58:11 [xq1z5bbcvy] → win TYPE:10 ID:060#BUEP TIME:12.969
    
  Find all rows containing 'win ', 
    split by type and get the second part, 
    convert results to numbers, 
    sum it up:
    
  cat log.log | pipe2js -f -c 'win ' -m 'a.split("TYPE:")[1]' -m -n -r 'a+b'
  
` );
			process.exit( 0 );
		}
	}
};
var helpKeys = Object.keys( keys ).sort();

// aliases
helpKeys.forEach( function( key ) {
	var param = keys[ key ];
	param.name = key;
	if( param.alias ) {
		keys[ param.alias ] = param;
	}
  if( param.aliases ) {
    param.aliases.forEach(function(alias){
      keys[ alias ] = param;
    })
  }
} );

var bypass = a => a;

var Processor = function( consume, awk ) {
	this.preprocess = [];
	this.postprocess = [];
	this.decorators = [];
	this.cursor = 0;
	this.fn = bypass;
	this.awk = awk;
	consume && ( this.consume = consume );
};
Processor.prototype = {
	state: 'ACTIVE',
	fn: bypass,
	consume: function( line, pipelineCursor ) {
		var processed = this.preprocess.reduce( function( val, fn ) {
			return fn( val );
		}, line );
		this.previous = this.current;
		this.processed = processed;
		try {
			this.current = this.fn( processed, this.previous, this.cursor, this.awk.total, processed, processed );
		}catch( e ){
			console.error('Error in runtime. Syntax error. Verbose dump')
			this.awk.args.parsed.forEach(function(parsed, n){
				console.error('\t'+ (n+1) + ') '+ parsed.join(' '))
			});
			var [, lineno, colno] = e.stack.match(/<anonymous>:(\d+):(\d+)/);

			var pad = function(num){
			    return num > 0 ? new Array(num+1).join(' '): '';
			}
			console.error('\n\t'+ (this.awk.args.parsed.length+1) + ') '+ this.name + ' '+ this.usedArgs.join(' '))
			console.error('\t'+ pad(((this.awk.args.parsed.length+1) + ') '+ this.name + ' ').length+(colno-0)-1) +'^ '+ e.message)

			//process.exit(1);
			throw new Error(e.message);
		}
		this.current = this.postprocess.reduce( function( val, fn ) {
			return fn( val );
		}, this.current );

		this.next( pipelineCursor );
		this.cursor++;
	},
	finish: function( pipelineCursor ) {
		this.state = 'FINISHING';
		if( this.finishFn ) {
      this.finishFn( pipelineCursor );

    } else {
			if( pipelineCursor < this.awk.pipeline.length - 1 ) {
				this.awk.pipeline[ pipelineCursor + 1 ].finish( pipelineCursor + 1 );
			}else{
        this.awk.finished = true;
        this.awk.afterEnd && this.awk.afterEnd();
      }
		}
		this.state = 'FINISHED';
	},
	decorate: function( code ) {
		return this.decorators.reduce( function( code, fn ) {
			return fn( code );
		}, code )
	}
};

var AWK = function() {
	this.total = 0;
};
AWK.prototype = {
	parseArgs: function(args){

		this.args = {
			raw: args,
			argCount: args.length,
			currentArgPointer: 0,
			getArg: function() {
				return args[ this.currentArgPointer++ ];
			},
			returnArg: function() {
				this.currentArgPointer--;
			},
			parsed: []
		};
		this.pipeline = [];

		while( this.args.currentArgPointer < this.args.argCount ){
			var argStart = this.args.currentArgPointer;
			var arg = this.args.getArg();
			if(arg in keys){
				keys[arg].fn(this, this.args);
			}else{
				console.error(`Unknown parameter ${arg}`);
				process.exit(1);
			}
			var argEnd = this.args.currentArgPointer;
			this.args.parsed.push(args.slice(argStart, argEnd))
		}

		var _self = this;
    var outputProcessor = new Processor(function(line){
      _self.output(line);
    }, this);
    outputProcessor.finishFn = function(){
        this.awk.finished = true;
        this.awk.afterEnd && this.awk.afterEnd();
    };
		this.pipeline.push(outputProcessor);

		this.pipeline[this.pipeline.length - 1].name = 'output'

	},
	output: function(line){
		console.log(line);
		/*process.stdout.write(line);*/
	},
	consume: function(data){
		this.total++;
		return this.pipeline[0].consume(data, 0);
	},
	finish: function(){
		this.pipeline[ 0 ].finish( 0 );
	}
};





/*var code = process.argv.slice(2).join(' ');
console.log(process.argv)*/
//var fn = new Function('', 'return (line, i)=>(\n'+code+'\n)')();




if (typeof require !== 'undefined' && typeof module !== 'undefined' && require.main === module) {
	var awk = new AWK();
	awk.parseArgs([].slice.call(process.argv, 2));

	var DEBUG = false;
  var fs = require( 'fs' );

  if(DEBUG) {
		var fs = require( 'fs' );
		var data = fs.readFileSync( 'test/input/json_log' ).toString().split( /\r\n|\n/ );
		//var data = fs.readFileSync( 'test/data/filterData.log' ).toString().split( /\r\n|\n/ );
		/*var data = fs.readFileSync('test/testData.log').toString().split(/\r\n|\n/);*/
		data.forEach( function( line ) {
			awk.consume( line );
		} );
    awk.afterEnd = function() {
      process.exit(0);
    }
    awk.finish( );


	}

  DEBUG = false;

	const readline = require('readline');
  if(DEBUG){
/*    var d = fs.readFileSync('test/input/json_log', 'utf-8');
    var jj = 0;
    fs.writeFileSync('test/input/json_log', d.replace(/(\{)/g, function(){
        jj++;
        return `{"f": ${jj}, `
    }));*/


    var rl = readline.createInterface({
      input: fs.createReadStream('test/input/json_log', 'utf-8'),
      output: process.stdout,
      terminal: false
    });
    //rl = fs.createReadStream('test/input/json_log', 'utf-8');
  }else{
    var rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: false
    });
  }


	var currentLineNumber = 0;

	rl.on('line', (line) => {
		line = line.toString();

/*    fs.appendFile("verbose.txt", line, (err) => {
      if (err) {
        console.log(err);
      }
      else {

      }
    });*/
		awk.consume(line, 0);
	});

	rl.once('close', () => {
		// end of input
		awk.finish();
	});

	process.on('SIGINT', function() {
		awk.finish();
    awk.afterEnd = function() {
      process.exit();
    }
	});
}else{
	module.exports = AWK;
}
/*process.stdin.on( 'end', function() { console.log( 'EOF' ) } );*/

/*process.stdin.on("data", data => {
    data = data.toString().toUpperCase()
    process.stdout.write(x++ + ')'+data + "\n")
})*/
