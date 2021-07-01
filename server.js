require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");

//require databse Connection
const dbConnect = require("./db/dbConnect");


// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());

app.use('/public', express.static(`${process.cwd()}/public`));

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.get('/api/hello', function(req, res) {
  res.json({ greeting: 'hello API' });
});

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});

// execute databse connection
dbConnect();

//Set up db schema
let Schema = mongoose.Schema
let urlSchema = new Schema({
    original: {type: String, required: true},
    short: Number
});

//Set up mongoose model
let Url = mongoose.model('Url', urlSchema);

let responseObject = {};
app.post('/api/shorturl', bodyParser.urlencoded({ extended: false}), (request, response)=>{
    //take in URL from form input with bodyParser
    let inputUrl = request.body['url']

    //validate URL with regex
    let urlRegex = new RegExp(/((([A-Za-z]{3,9}:(?:\/\/)?)(?:[-;:&=\+\$,\w]+@)?[A-Za-z0-9.-]+|(?:www.|[-;:&=\+\$,\w]+@)[A-Za-z0-9.-]+)((?:\/[\+~%\/.\w-_]*)?\??(?:[-\+=&;%@.\w_]*)#?(?:[\w]*))?)/)

    if(!inputUrl.match(urlRegex)){
        response.json({error: 'Invalid URL'})
        return
    }

    //mongoose method findOneAndUpdate is deprecated need to set this to prevent error
    mongoose.set('useFindAndModify', false);

    responseObject['original_url'] = inputUrl

    let inputShort = 1

    //Checking the database model to see how many documents are there and then return the largest short value. For the latest URL that is to be shortened.
    Url.findOne({})
        .sort({short: 'desc'})
        .exec((error, result)=>{
            if(!error && result != undefined){
                inputShort = result.short + 1
            }
            if(!error){
                 Url.findOneAndUpdate(
                     {original: inputUrl},
                     {original: inputUrl, short: inputShort},
                     {new: true, upsert: true},
                     (error, savedUrl)=>{
                         if(!error){
                             responseObject['short_url'] = savedUrl.short
                             response.json(responseObject)
                         }
                     }
                 )
            }
        })
});

app.get('/api/shorturl/:input', (request, response)=>{
    let input = request.params.input

    Url.findOne({short: input}, (error, result)=>{
        if(!error && result != undefined){
            response.redirect(result.original)
        }else{
            response.json('URL not found')
        }
    })
})
