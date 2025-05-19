import { useState, useEffect } from "react";
import axios from 'axios';

const BulkUpload = () => {
    const [file, setFile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [jobs, setJobs] = useState([]);
    const [results, setResults] = useState([]);
    const [completedJobs, setCompletedJobs] = useState(0);

    const handleUpload = async (e) => {
        e.preventDefault();
        if (!file) return;

        setIsLoading(true);
        setMessage(null);
        setError(null);
        setJobs([]);
        setResults([]);
        setCompletedJobs(0);

        const formData = new FormData();
        formData.append('file', file);

        try {
            await axios.delete('http://localhost:3500/jobs');

            const res = await axios.post('http://localhost:3500/upload', formData);
            setMessage(`File uploaded. Processing ${res.data.totalRecords} records in ${res.data.jobs.length} batches.`);
            setJobs(res.data.jobs);
            setFile(null);
            console.log("response", res)
            // Poll each job result
            const pollJobStatus = async (jobId, interval = 2000, maxAttempts = 15) => {
                let attempts = 0;
                let jobResult;
            
                while (attempts < maxAttempts) {
                    try {
                        const response = await axios.get(`http://localhost:3500/job-status/${jobId}`);
                        jobResult = response.data;
            
                        if (jobResult.state === 'completed' || jobResult.state === 'failed') {
                            break;
                        }
                    } catch (err) {
                        console.error(`Polling error for job ${jobId}:`, err);
                    }
            
                    await new Promise(resolve => setTimeout(resolve, interval));
                    attempts++;
                }
            
                return jobResult;
            };
            
            res.data.jobs.forEach(async (job) => {
                const result = await pollJobStatus(job.id);
                if (result) {
                    setResults(prev => [...prev, result]);
                    setCompletedJobs(prev => prev + 1);
                } else {
                    setResults(prev => [...prev, {
                        id: job.id,
                        status: 'failed',
                        error: 'Job polling timed out or failed.'
                    }]);
                    setCompletedJobs(prev => prev + 1);
                }
            });
            

        } catch (err) {
            console.error("Upload error:", err);
            setError(err.response?.data?.message || "Failed to upload file.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files?.length) {
            setFile(e.target.files[0]);
            setMessage(null);
            setError(null);
        }
    };

    useEffect(() => {
        if (jobs.length > 0 && completedJobs === jobs.length) {
            setMessage(prev => `${prev || ''}  All ${jobs.length} jobs completed.`);
        }
    }, [completedJobs, jobs.length]);
    console.log("results from ", results);
    

    return (
        <div className="flex flex-col items-center justify-center gap-4 mt-10 max-w-4xl mx-auto">
            <div className="flex items-center justify-center gap-4 w-full">
                <a 
                    href="/userUploadTemplate.xlsx"
                    download
                    className="cursor-pointer border px-5 py-2 rounded hover:bg-blue-300 hover:text-white"
                >
                    Download Template
                </a>

                <form onSubmit={handleUpload} encType="multipart/form-data" className="flex gap-3 items-center">
                    <div>
                        <label htmlFor="inputFile" className="cursor-pointer border px-5 py-2 rounded  hover:bg-blue-300 hover:text-white">
                            {file ? file.name : "Import Excel"}
                        </label>
                        <input 
                            id="inputFile"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={!file || isLoading}
                        className="cursor-pointer border px-5 py-2 rounded  hover:bg-blue-300 hover:text-white"
                    >
                        {isLoading ? "Uploading..." : "Upload to DB"}
                    </button>
                </form>
            </div>

            {message && (
                <div className="mt-4 p-2 bg-green-100 text-green-800 rounded w-full text-center">
                    {message}
                </div>
            )}

            {error && (
                <div className="mt-4 p-2 bg-red-100 text-red-800 rounded w-full text-center">
                    {error}
                </div>
            )}

            {results.length > 0 && (
                <div className="w-full mt-6">
                    <h2 className="text-xl font-semibold mb-2">Job Processing Results</h2>
                    <table className="w-full border border-gray-300">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="border px-4 py-2">Job ID</th>
                                <th className="border px-4 py-2">Inserted</th>
                                <th className="border px-4 py-2">Failed</th>
                                <th className="border px-4 py-2">Status</th>
                                <th className="border px-4 py-2">Error (if any)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.map((job, idx) => (
                                <tr key={idx} className="text-center">
                                    <td className="border px-4 py-2">{job.id}</td>
                                    <td className="border px-4 py-2">{job.successfulRecords || 0}</td>
                                    <td className="border px-4 py-2">{job.failedRecords || 0}</td>
                                    <td className={`border border-black px-4 py-2 ${job.status == 'success' ? 'text-green-700' : 'text-red-700'}`}>
                                        {job.status}
                                    </td>
                                    <td className={`border border-black px-4 py-2 text-sm text-center ${job.errors.length > 0 ? 'text-red-600' : 'text-black'} whitespace-pre-wrap`}>
                                    {
                                        job.errors.length > 0 ? job.errors : 'No errors'
                                    }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default BulkUpload;
