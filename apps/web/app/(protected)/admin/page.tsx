import { redirect } from 'next/navigation';
import { getSession } from '@/server/auth/session';
import { listAllStages } from '@/server/workflow';
import { listTransitions } from '@/server/admin/transitions';
import { listTags } from '@/server/admin/tags';
import { listUsers } from '@/server/admin/users';
import { AdminTabs } from '@/components/admin/admin-tabs';

export default async function AdminPage() {
  const session = await getSession();

  // Only admins can access this page
  if (session?.user?.role !== 'ADMIN') {
    redirect('/board');
  }

  const [stages, transitions, tags, users] = await Promise.all([
    listAllStages(),
    listTransitions(),
    listTags(),
    listUsers(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage workflow stages, transitions, users, and tags
        </p>
      </div>

      <AdminTabs
        initialStages={stages}
        initialTransitions={transitions}
        initialTags={tags}
        initialUsers={users}
      />
    </div>
  );
}
