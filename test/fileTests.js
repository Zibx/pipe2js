var fs = require('fs'),
	path = require('path');

var assert = require('assert');
var parser = require('shell-quote').parse;
var sinon = require("sinon");

var lists = {};

var AWK = require('../');

['request', 'input', 'output'].forEach(function(name){
	lists[name] = fs.readdirSync(path.join(__dirname, name));
});

//lists.request = ['fileWithJSONs'];
describe('Test all cases', function() {
	lists.request.forEach( function( fileName ) {
		it( `Testing ${fileName}`, function(done) {
			var argsData = fs.readFileSync(path.join(__dirname, 'request', fileName)).toString('utf-8');
			var argsLines = argsData.split(/\r\n|\n/);
			var argsComments = argsLines
				.filter(line => line[0] === '#')
				.map(line => line.substr(1).trim());
			if(argsComments)
				console.log(argsComments.join('\n'));

			var args = parser(argsLines.filter(a=>a[0] !== '#').join('\n'));

			console.log(`parsed arguments: ${JSON.stringify(args)}`)

			var stub = sinon.stub(process, 'exit');
			var awk = new AWK();
      try {
        awk.parseArgs( args );
      }catch(e){
        stub.restore();
        if(argsComments.filter(line => line === 'EXCEPTION').length){
          var exceptionText = argsComments.filter(line => line.indexOf('EXCEPTION TEXT:')>-1);
          if(exceptionText.length){
            var text = exceptionText.join('\n').split('EXCEPTION TEXT:')[1].trim();
            if(e.message.indexOf(text)>-1){
              console.log('Exception was expected');
            }else{
              throw new Error(`Error message does not match: ${e.message} vs ${text}`);
            }
          }else {
            console.log( 'Exception was expected' )
          }
          return done();
        }else{
          throw new Error();
        }
        return done();
      }
			stub.restore();

			if(stub.calledOnce){
				if(argsComments.filter(line => line === 'EXCEPTION')){
					console.log('Exception was expected')
					return done();
				}else{
					throw new Error();
				}
				return done();
			}

			var inputData = fs.readFileSync(path.join(__dirname, 'input', fileName)).toString('utf-8');
			var lines = inputData.split(/\r\n|\n/);

			var result = [];

      ``
			awk.output = function(data){
			    result.push(data);
			};
      awk.afterEnd = function(){
        var outputData = fs.readFileSync(path.join(__dirname, 'output', fileName)).toString('utf-8');
        var [is, must] = [result.join('\n').trim(), outputData.split(/\r\n|\n/).join('\n').trim()];
        if(is !== must){
          console.log('Does not match, verbose output');
          awk.pipeline.forEach((pipeline, i) =>{
            console.log(`STEP ${i+1} ${pipeline.name}`);
            console.log({processed: pipeline.processed, current: pipeline.current})
            console.log('\n');
          });
        }else{
          console.log('Result matched: ', result.join('\n').trim())
        }
        assert.equal(is, must);
        done();
      };

			try {
				var stub = sinon.stub( process, 'exit' ).callsFake( () => {
					throw new Error( 'Error' );
				} );

				for( var i = 0; i < lines.length; i++ ) {
					var line = lines[ i ];
					awk.consume( line );
				}
				awk.finish();
				stub.restore();
			}catch(e){
				stub.restore();
				if(argsComments.filter(line => line === 'EXCEPTION').length){
					var exceptionText = argsComments.filter(line => line.indexOf('EXCEPTION TEXT:')>-1);
					if(exceptionText.length){
						var text = exceptionText.join('\n').split('EXCEPTION TEXT:')[1].trim();
						if(e.message.indexOf(text)>-1){
							console.log('Exception was expected');
						}else{
							throw new Error(`Error message does not match: ${e.message} vs ${text}`);
						}
					}else {
						console.log( 'Exception was expected' )
					}
					return done();
				}else{
					throw new Error();
				}
				return done();

			}


		} );
	} );
});
