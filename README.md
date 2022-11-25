# Pipe2js is 
If you are a JavaScript developer, then this is a tool that you have missed for the whole life.

Use javaScript to Map, Filter, Reduce the standard input to the standard output. It uses streams, so you can process really huge files.

And on top of it — now you can dive into JSON files right on your servers.

## Great, how can I get it???77

Use `yarn global add pipe2js` or `npm i -g pipe2js` command to install it.

It requires Node.js of at least v4.12

`pipe2js` does not have any dependencies right now, so you can easily read its source to be sure that there is nothing malicious.


This README is in-progress, so for now here is the help from -h flag

## Hwat else should I know?

If you are using js templates (-t flag) — wrap your code in single quotes. In double quotes ${someVar} would be parsed by sh and replaced by an ENV variable.

```
Usage: cat [FILE] | pipe2js [OPTION]...
Use javaScript flavor to Map, Filter, Reduce standard input to standard output. This tool use stream and can process huge files.

Options:
-c, --contain   check if line contains string
-f, --filter    filter data with your condition. can be combined with -c and -x

                  Avaliable Variables:
                    `line`, `a`, `obj` - current item
                    `previous`         - previously processed item
                    `i`                - item number
                    'total`            - total number of consumed lines

                  Usage Example:
                    ping 8.8.8.8 | pipe2js -f 'parseInt(line.split("icmp_seq=")[1])>2'
                    ping 8.8.8.8 | pipe2js -f -c '3'

-flat, --flat   convert array to separate items
-h, --help      display this help and exit
-j, --json      convert JSON String to an Object. Attention: JSON is not parsing as stream, so initial string is fully placed in memory

                  Usage Example:
                  1. Get package version
                  cat package.json | pipe2js -j -m 'obj.version'

                  2. We have got an array of objects, list only ids of objects that have amount=10. Objects looks like: { id: '10p-n-1wu', amount: 5, win: true }
                  cat tickets.json | pipe2js -j --flat -f "obj.amount===10" -m -t '${obj.win?"+":"-"}${obj.id}'


-m, --map       map data. if combined with -n - would input numbers

                  Avaliable Variables:
                    `line`, `a`, `obj` - current item
                    `previous`         - previously processed item
                    `i`                - line number
                    'total`            - total number of consumed lines

                  Usage Example:

                  1. Customize output by mapping with template
                  > ping 8.8.8.8 | pipe2js -f -x '^64 ' -m -t '${i+1}) ${line.split("time=")[1]}'
                  1) 68.7 ms
                  2) 68.4 ms

                  2. Generating some sequence (0 1 3 6 10 15 ...)
                  > ping 8.8.8.8 | pipe2js -m 'i+previous|0'

-n, --number    convert input to number. Operates with string may cause concat instead of sum
-r, --reduce    reduce given items. Great for calculating sum

                  Avaliable Variables:
                    `a` - current item
                    `b` - current item
                    `i`         - line number
                    'total`     - total number of consumed lines

                  Usage Example:

                  1. Calculate pings count
                  > ping 8.8.8.8 | pipe2js -m '1' -r 'a+b'

                  2. Generating some sequence (0 1 3 6 10 15 ...)
                  > ping 8.8.8.8 | pipe2js -m 'i+previous|0'

-x, --regexp    use regexp to filter
-t, --tpl       code is a template

                  ping 8.8.8.8 | pipe2js -m 'line.split("time=")[1]' -f -n -r "a+b" -m -t 'sum: ${a}, total: ${total}, avg: ${a/total}'

-v, --version   display version of and exit

You can use any count of maps, filters. and reduces

Examples:
1. To calculate how many prizes were won from log where wins looks like:
   2022-10-22 11:58:11 [xq1z5bbcvy] → win TYPE:10 ID:060#BUEP TIME:12.969

Find all rows containing 'win ',
split by type and get the second part,
convert results to numbers,
sum it up:

cat log.log | pipe2js -f -c 'win ' -m 'a.split("TYPE:")[1]' -m -n -r 'a+b'

```

MPL-2.0 License