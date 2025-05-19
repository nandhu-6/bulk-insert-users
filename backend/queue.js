const { Queue, Job } = require('bullmq');
const IORedis = require('ioredis');
const express = require('express');
require('dotenv').config();

const router = express.Router();


const connection = new IORedis({
    host: 'localhost',
    port: 6379,
    maxRetriesPerRequest: null
});

const userQueue = new Queue('user-import', { connection });

let jobIds = [];

// Add a job and store its ID
const addJob = async (name, data) => {
    const job = await userQueue.add(name, data);
    jobIds.push(job.id);
    return job;
};

// Get all job IDs
// router.get('/jobs', (req, res) => {
//     res.json({ jobIds });
// });

// Get status of a specific job
router.get('/job-status/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const job = await userQueue.getJob(id);
        // console.log("job", job);
        
        if (!job) {
            return res.status(404).json({ message: 'Job not found' });
        }

        const state = await job.getState();
        const result = job.returnvalue || null;
        const errors = job.returnvalue?.failedDetails?.map(e => 'row' + (e.index+1) + ': ' + e.error) || null;

       
        
        res.json({
            id: job.id,
            state: state,
            status : result?.status,
            totalRecords: result?.totalRecords,
            successfulRecords: result?.successfulRecords,
            failedRecords: result?.failedRecords,
            failedDetails: result?.failedDetails,
            errors
        });
    } catch (err) {
        console.error('Error getting job status:', err);
        res.status(500).json({ message: 'Error getting job status' });
    }
});

router.delete('/jobs', async (req, res) => {
    try {
        await userQueue.obliterate();
        jobIds = [];
        res.json({ message: 'All jobs cleared' });
    } catch (err) {
        console.error('Error clearing jobs:', err);
        res.status(500).json({ message: 'Error clearing jobs' });
    }
});

module.exports = {
    userQueue,
    addJob,
    jobRouter: router,
    jobIds
};