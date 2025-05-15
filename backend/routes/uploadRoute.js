const express = require('express');
const multer = require('multer');
const path = require('path');
const xlsx = require('xlsx');
const fs = require('fs');
const { userQueue, addJob, jobRouter } = require('../queue');
const router = express.Router();

const upload = multer({ dest: 'uploads/' })

// Add job router to handle job status endpoints
router.use(jobRouter);

router.post('/upload', upload.single('file'), async (req, res) => {
    if(!req.file){
        return res.status(400).send("No file uploaded");
    }
    try{
        const filePath = req.file.path;
        const workbook = xlsx.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const users = xlsx.utils.sheet_to_json(sheet); //the rows

        const chunkSize = 50;
        const jobs = [];
        
        for(let i=0; i<users.length; i+=chunkSize){
            const chunk = users.slice(i, i+chunkSize);
            const startIndex = i;
            const endIndex = Math.min(i + chunkSize - 1, users.length - 1);
            
            // Add job and get job ID
            const job = await addJob('process', { 
                users: chunk,
                range: `${startIndex+1}-${endIndex+1} of ${users.length}`
            });
            
            jobs.push({
                id: job.id,
                range: `${startIndex+1}-${endIndex+1} of ${users.length}`,
                count: chunk.length
            });
            
            console.log(`Queued ${chunk.length} users (${startIndex+1}-${endIndex+1} of ${users.length})`);
        }

        fs.unlinkSync(filePath);
        res.json({ 
            message: 'File uploaded successfully and queued for processing',
            totalRecords: users.length,
            jobs: jobs
        });
    }catch(err){
        console.error(err);
        res.status(500).json({ message: 'Error while uploading file' });
    }
});
    
module.exports = router;