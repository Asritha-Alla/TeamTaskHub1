import { useGetMe, getGetMeQueryKey, useListUsers, getListUsersQueryKey } from "@workspace/api-client-react";
import { useTheme } from "@/components/theme-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { Sun, Moon, Monitor } from "lucide-react";

const THEMES = [
  { value: "light" as const, label: "Light", icon: Sun },
  { value: "system" as const, label: "System", icon: Monitor },
  { value: "dark" as const, label: "Dark", icon: Moon },
];

export default function Settings() {
  const { data: user, isLoading } = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const { data: users, isLoading: isUsersLoading } = useListUsers({ query: { queryKey: getListUsersQueryKey() } });
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-4 sm:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your profile and preferences.</p>
      </div>

      <div className="bg-card rounded-lg border divide-y">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold">Profile</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          {isLoading ? (
            <>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
                  style={{ backgroundColor: user?.avatarColor || "#6366f1" }}
                >
                  {user?.name?.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-sm text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="space-y-0.5">
                  <p className="text-muted-foreground text-xs">Member since</p>
                  <p className="font-medium">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-card rounded-lg border divide-y">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold">Appearance</h2>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm text-muted-foreground mb-3">Choose how TaskMaster looks to you.</p>
          <div className="flex flex-wrap gap-2">
            {THEMES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                  theme === value
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-card rounded-lg border divide-y">
        <div className="px-6 py-4">
          <h2 className="text-sm font-semibold">Team Members</h2>
        </div>
        <div className="divide-y">
          {isUsersLoading
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-6 py-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-28" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                </div>
              ))
            : users?.map((u) => (
                <div key={u.id} className="flex items-center gap-3 px-6 py-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold shrink-0"
                    style={{ backgroundColor: u.avatarColor || "#6366f1" }}
                  >
                    {u.name
                      .split(" ")
                      .map((w) => w[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </div>
              ))}
        </div>
      </div>
    </div>
  );
}
