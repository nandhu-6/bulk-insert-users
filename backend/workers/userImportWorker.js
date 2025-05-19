const { Worker } = require('bullmq');
const IORedis = require('ioredis');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'Root@123',
    database: 'bulk_insert'
});

const connection = new IORedis({
    host: "localhost",
    port: 6379,
    maxRetriesPerRequest: null
})

const userWorker = new Worker('user-import', async (job) => {
    console.log('Processing job:', job.id, 'Range:', job.data.range);
    const users = job.data.users;
    const range = job.data.range;

    if (!users || !Array.isArray(users)) {
        console.error('Invalid job data format:', job.data);
        throw new Error('Invalid job data format');
    }

    const results = {
        total: users.length,
        successful: [],
        failed: [],
        range: range
    };

    try {
        console.log(`Preparing to insert ${users.length} users from range ${range}`);
        
        for (let i = 0; i < users.length; i++) {
            const user = users[i];
            try {

                await job.updateProgress(Math.floor((i / users.length) * 100));
             
                await pool.query('INSERT INTO employee SET ?', user);
                
                results.successful.push({
                    index: i,
                    data: user
                });
            } catch (err) {
                results.failed.push({
                    index: i,
                    data: user,
                    error: err.message
                });
                console.error(`Error inserting user at index ${i}:`, err.message);
            }
        }
        
        console.log(`Job ${job.id} completed: ${results.successful.length} successful, ${results.failed.length} failed`);
        
        return {
            status: results.failed.length === 0 ? 'success' : 'partial',
            totalRecords: results.total,
            successfulRecords: results.successful.length,
            failedRecords: results.failed.length,
            range: results.range,
            failedDetails: results.failed.map(f => ({
                index: f.index,
                error: f.error,
                data: {
                    name: f.data.name,
                    email: f.data.email
                }
            }))
        };
    } catch (err) {
        console.error('Job failed completely:', err);
        throw new Error(`Job failed: ${err.message}`);
    }
}, { 
    connection,
    concurrency: 1, // Process number of jobs at a time
    stalledInterval: 30000, // Check for stalled jobs every 30 seconds
    // maxStalledCount: 3 // Allow 3 stalls before marking as failed
});

userWorker.on('completed', (job, result) => {
    console.log(`Job ${job.id} completed with result:`, {
        status: result.status,
        totalRecords: result.totalRecords,
        successfulRecords: result.successfulRecords,
        failedRecords: result.failedRecords,
        range: result.range
    });
})

userWorker.on('failed', (job, error) => {
    console.error(`Job ${job.id} failed with error:`, error.message);
})

userWorker.on('progress', (job, progress) => {
    console.log(`Job ${job.id} progress: ${progress}%`);
})