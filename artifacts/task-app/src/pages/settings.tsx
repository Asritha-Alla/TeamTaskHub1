import { useGetMe, getGetMeQueryKey, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";

export default function Settings() {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: users } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });

  if (isLoading) return <div className="p-8">Loading settings...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      
      <div className="bg-card p-6 rounded-lg border">
        <h2 className="text-xl font-semibold mb-4">Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Name</label>
            <p className="font-medium">{user?.name}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Email</label>
            <p className="font-medium">{user?.email}</p>
          </div>
          <div>
            <label className="text-sm text-muted-foreground">Joined</label>
            <p className="font-medium">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : ''}</p>
          </div>
        </div>
      </div>

      <div className="bg-card p-6 rounded-lg border mt-8">
        <h2 className="text-xl font-semibold mb-4">Team Members</h2>
        <div className="space-y-2">
          {users?.map(u => (
            <div key={u.id} className="flex items-center space-x-3 p-2 border-b last:border-0">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: u.avatarColor }}>
                {u.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{u.name}</p>
                <p className="text-xs text-muted-foreground">{u.email}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}