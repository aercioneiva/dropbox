var express = require('express');
var formidable = require('formidable');
var router = express.Router();
var fs = require('fs');


/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/upload', function(req, res, next) {

  let form = new formidable.IncomingForm({
    uploadDir: './upload',
    keepExtensions: true
  });

  form.parse(req,(err, fields, files)=>{
    res.json({
      files
    });
  });

  
});

router.delete('/:name', function(req, res, next) {

  const { name } = req.params;

  fs.unlink('./upload/'+name, (err) => {
    console.log(`upload/${name} was deleted`);
    res.json({sucess : `upload/${name} was deleted`});
  });

});

router.get('/file',(req,res)=>{
  const path = './'+req.query.path;
  if(fs.existsSync(path)){
   fs.readFile(path, (err, data)=>{
      if(err){
         res.status(400).json({error:err});
      }else{
         console.log(data)
         res.status(200).end(data);
      }
   });
  }else{
   res.status(404).json({error:'File not found'});
  }
});

module.exports = router;
