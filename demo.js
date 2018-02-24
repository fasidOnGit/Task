var express = require('express');
var app = express();
var xlsx = require('xlsx');
var http = require('http').Server(app);
var multer  = require('multer')
// var rp = require('request-promise');
var fs = require('fs');
const {Readable} = require('stream');

//storing the xlsx file to local using multer
var storage =   multer.diskStorage({  
    destination: function (req, file, callback) {  
        console.log('deii' , file)
      callback(null, './uploads/');  
    },  
    filename: function (req, file, callback) {  
        console.log('deii' , file)
      callback(null, file.originalname);  
    }  
  });  

  var upload = multer({storage: storage ,  limits: {fileSize: 1000000}}).single('file-to-upload');

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
  });
  
app.post('/csv' , function(req ,res){
    //calling the multer to save the file
    upload(req , res , function(err){
        if(err){
            console.log('Error Occured');
            return;
        } 
        var filename = `${req.file.destination}${req.file.originalname}`;

        console.log(filename)
        //parsing the xlsx into json
       readXLSX(filename).then(jsonArr =>{
           //creeating a readable stream to emit data as chunks
            const inStream = new Readable({
                read(size){
                },
                objectMode:true
            });

            var allPromise = []; 

            var i,j,temparray,chunk = 10;

            for (i=0,j=jsonArr.length; i<j; i+=chunk) {
                //slicing the json array into 10 chunks to match the buffer
                temparray = jsonArr.slice(i,i+chunk);
                //pushing the chunked array to the stream
                inStream.push(temparray)
            }
            //to indicate no more to emit
            inStream.push(null);

            inStream.on('data' , chunk => {
                //post the all the chunked array into the endpoint concurretly and managing flow control
                allPromise.push(fakeAsyncCall(chunk));
            });
            inStream.on('end' , () => {
                console.log('done');
                var composable = []
                //compose all the results into one array
                Promise.all(allPromise).then(all =>{
                    composable.push(...all); //es6 spread operator to compose into one array
                    res.send(composable);
                }).catch(err => {
                    console.error(err);
                    res.status(500).send('Error in Writing to the endpoint');
                });
            });

            inStream.on('error' , err => {
                console.log(err);
                res.status(500).send('Error in Stream');
            })

        }).catch(err => {
            console.log(err);
            res.status(500).send('error in reading file');
        })
    });

});

http.listen(3000 , function(err){
    if(err) throw err;
    console.log('Listening to the port 3000');
    console.log('Please visit http://localhost:3000/')
})

/**
 * takes in an xlsx file path and parse it with xlsx
 * @param {fullpath} path 
 */
function readXLSX(path){
    return new Promise(function(resolve , reject){
        var workbook = xlsx.readFile(path);
        var first_sheet_name = workbook.SheetNames[0];

        var worksheet = workbook.Sheets[first_sheet_name];

        var jsonArr = xlsx.utils.sheet_to_json(worksheet);

        resolve(jsonArr);
    })
}

/**
 * takes in an array of data and simulate an async call to the db
 * @param {arrayof data} arr 
 */
function fakeAsyncCall(arr){
return new Promise(function(resolve , reject){
    // let config = {
    //     method : 'POST',
    //     uri:'thepostendpoint',
    //     data:arr
    // }

    //rp(config).then(result => ).catch(err => )

    setTimeout(() => {resolve(arr)},2000);
});
}


//empid empname managerid salary


// select t2.empname from emptable t1 , emptable t2  where t1.empid = t2.managerid and t1.salary < t2.salary;  
