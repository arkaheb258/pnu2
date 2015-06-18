var email   = require("emailjs");
var email_server  = email.server.connect({
   user:    "karta.pracy.kmsa", 
   password:"", 
   host:    "domino1.kopex.com.pl", 
   ssl:     true
});

// send the message and get a callback with an error or details of the message that was sent
email_server.send({
   text:    "i hope this works", 
   from:    "you <username@your-email.com>", 
   to:      "someone <arkadiusz.heblinski@kopex.com.pl>",
   subject: "testing emailjs",
   attachment: [{data:"<html>i <i>hope</i> this works!</html>", alternative:true}]
}, function(err, message) { console.log(err || message); });