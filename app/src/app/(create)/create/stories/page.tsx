import { createClient, getUser } from '@/lib/supabase/server'
import Link from 'next/link'
import { BookOpen, Clock, Sparkles, AlertCircle, RefreshCw, Trash2 } from 'lucide-react'
import { StoryCard } from '@/components/StoryCard'
import { CoverStatus, VibeJobStatus } from '@/types/chronicle'
import { InProgressCard } from './InProgressCard'
import { isJobStuck, JOB_RECOVERY_CONFIG } from '@/lib/job-recovery'

export default async function StoriesPage() {
  const supabase = await createClient()
  const { user } = await getUser()

  // Fetch all user's vibe-generated stories with their job status
  const { data: stories, error } = await supabase
    .from('books')
    .select(`
      id, title, status, created_at, core_question, cover_url, cover_status,
      vibe_jobs!inner(id, status, step, progress, error, updated_at, auto_resume_attempts)
    `)
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .order('created_at', { ascending: false })

  // Also fetch stories without jobs (completed ones)
  const { data: completedOnly } = await supabase
    .from('books')
    .select('id, title, status, created_at, core_question, cover_url, cover_status')
    .eq('owner_id', user?.id)
    .eq('source', 'vibe')
    .eq('status', 'final')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching stories:', error)
  }

  // Merge results - use completedOnly for final stories
  const completedStories = completedOnly || []

  // In progress stories with job info
  type StoryWithJob = typeof stories extends (infer T)[] | null ? T : never
  const inProgressStories = (stories || []).filter((s: StoryWithJob) => {
    const job = Array.isArray(s.vibe_jobs) ? s.vibe_jobs[0] : s.vibe_jobs
    return s.status !== 'final' && job
  }).map((s: StoryWithJob) => {
    const job = Array.isArray(s.vibe_jobs) ? s.vibe_jobs[0] : s.vibe_jobs
    // Use centralized isJobStuck function
    const jobStatus = {
      id: job.id,
      status: job.status,
      step: job.step,
      progress: job.progress,
      updated_at: job.updated_at,
      auto_resume_attempts: job.auto_resume_attempts,
      error: job.error,
    }
    return {
      ...s,
      job,
      isStale: isJobStuck(jobStatus)
    }
  })

  return (
    <div style={{ maxWidth: 800 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 className="app-heading-1">Your Stories</h1>
          <p className="app-body" style={{ marginTop: '0.25rem', opacity: 0.7 }}>
            All the stories Chronicle has created for you
          </p>
        </div>
        <Link href="/create/new" className="app-button-primary">
          <Sparkles style={{ width: 16, height: 16 }} />
          New Story
        </Link>
      </div>

      {completedStories.length === 0 && inProgressStories.length === 0 ? (
        <div className="app-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <BookOpen style={{ width: 48, height: 48, color: 'var(--amber-warm)', margin: '0 auto 1rem', opacity: 0.6 }} />
          <h3 className="app-heading-3" style={{ marginBottom: '0.5rem' }}>No stories yet</h3>
          <p className="app-body-sm" style={{ marginBottom: '1.5rem' }}>
            Create your first story and it will appear here
          </p>
          <Link href="/create/new" className="app-button-primary">
            <Sparkles style={{ width: 16, height: 16 }} />
            Create a Story
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Completed Stories - Audio First */}
          {completedStories.length > 0 && (
            <section>
              <h2 className="app-label" style={{ marginBottom: '1rem' }}>
                Completed ({completedStories.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {completedStories.map((story) => (
                  <StoryCard
                    key={story.id}
                    story={{
                      id: story.id,
                      title: story.title,
                      status: story.status,
                      created_at: story.created_at,
                      core_question: story.core_question,
                      cover_url: story.cover_url,
                      cover_status: story.cover_status as CoverStatus,
                    }}
                  />
                ))}
              </div>
            </section>
          )}

          {/* In Progress */}
          {inProgressStories.length > 0 && (
            <section>
              <h2 className="app-label" style={{ marginBottom: '1rem' }}>
                In Progress ({inProgressStories.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {inProgressStories.map((story) => (
                  <InProgressCard
                    key={story.id}
                    story={{
                      id: story.id,
                      title: story.title,
                      status: story.status,
                      job: story.job,
                      isStale: story.isStale
                    }}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
