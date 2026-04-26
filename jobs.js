// In-memory job store
const jobs = {};

function createJob(id) {
  jobs[id] = {
    id,
    stage: 'Queued',
    percent: 0,
    done: false,
    error: null,
    outputPath: null,
    filename: null,
    createdAt: Date.now(),
  };
  // Auto-cleanup job after 15 minutes
  setTimeout(() => {
    delete jobs[id];
  }, 15 * 60 * 1000);
}

function updateJob(id, data) {
  if (jobs[id]) {
    Object.assign(jobs[id], data);
  }
}

function getJob(id) {
  return jobs[id] || null;
}

module.exports = { jobs, createJob, updateJob, getJob };
