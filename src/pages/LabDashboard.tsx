import React, { useState, useEffect } from 'react';
import { labApi, SplatJob } from '@/api/labApi';
import { Upload, Play, Loader, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/api/client';
import { SplatViewer } from '@/components/SplatViewer';

export const LabDashboard = () => {
  const [jobs, setJobs] = useState<SplatJob[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [activeJobId, setActiveJobId] = useState<string | null>(null);

  useEffect(() => {
    loadJobs();
    const interval = setInterval(() => {
      loadJobs();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadJobs = async () => {
    try {
      const data = await labApi.getJobs();
      setJobs(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    setIsUploading(true);
    
    try {
      // 1. Create job
      const { job_id, upload_path } = await labApi.createJob({
        title: file.name,
        is_360_video: true,
        quality_preset: 'balanced'
      });
      
      // 2. Upload file to Supabase directly
      const { error } = await supabase.storage.from('splat-jobs').upload(upload_path, file);
      if (error) throw error;
      
      // 3. Start pipeline
      await labApi.startJob(job_id);
      setActiveJobId(job_id);
      loadJobs();
    } catch (e) {
      console.error("Upload failed", e);
      alert("Upload failed");
    } finally {
      setIsUploading(false);
      setFile(null);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">3D Splat Lab</h1>
        <p className="text-gray-500">Upload 360-degree videos to automatically generate walkable 3D tours.</p>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Create New Tour</h2>
        <div className="flex gap-4 items-center">
          <input 
            type="file" 
            accept="video/*" 
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          <button 
            onClick={handleUpload}
            disabled={!file || isUploading}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2 rounded-lg disabled:opacity-50"
          >
            {isUploading ? <Loader className="animate-spin" /> : <Upload />}
            Upload & Process
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Your Jobs</h2>
        {jobs.map(job => (
          <div key={job.id} className="bg-white p-6 rounded-lg border shadow-sm flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold text-lg">{job.title}</h3>
                <p className="text-sm text-gray-500">Status: <span className="font-medium text-black">{job.status.toUpperCase()}</span></p>
                <p className="text-sm text-gray-500">{job.stage_message}</p>
              </div>
              <div className="flex items-center gap-2">
                {job.status === 'failed' && <XCircle className="text-red-500" />}
                {job.status === 'ready' && <CheckCircle className="text-green-500" />}
                {job.status !== 'ready' && job.status !== 'failed' && <Loader className="text-blue-500 animate-spin" />}
              </div>
            </div>

            {/* Progress Bar */}
            {job.status !== 'ready' && job.status !== 'failed' && (
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-500" style={{ width: `${job.progress}%` }}></div>
              </div>
            )}

            {job.error_message && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded">{job.error_message}</div>
            )}

            {job.status === 'ready' && job.splat_url && (
              <div className="h-[500px] w-full mt-4 rounded-xl overflow-hidden border">
                <SplatViewer url={job.splat_url} />
              </div>
            )}
          </div>
        ))}
        {jobs.length === 0 && (
          <div className="text-center p-12 bg-gray-50 rounded-lg text-gray-500 border border-dashed">
            No jobs yet. Upload a video to get started.
          </div>
        )}
      </div>
    </div>
  );
};
