/**
 * TRIGGER MAP - Phase 4 Core Infrastructure
 * Strict declarative mapping of events to queue jobs.
 * No dynamic logic, no AI. Strict deterministic output.
 */

export const TRIGGER_MAP = {
  form_submit_succeeded: {
    action: "queue_job",
    job_type: "lead_processing"
  },
  page_view: {
    action: "log_only"
  },
  cta_clicked: {
    action: "log_only"
  },
  contact_created: {
    action: "queue_job",
    job_type: "contact_sync"
  }
};
