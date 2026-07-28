import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { Bell, LogOut, Settings, User } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { useNavigate } from 'react-router';
import { useNotifications } from '../../hooks/useNotifications';
import { TopSubNav } from './TopSubNav';
import { ThemeToggle } from './ThemeToggle';

function getInitials(name: string) {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    compliance_officer: 'Compliance Officer',
    legal_practitioner: 'Legal Practitioner',
    manager: 'Manager',
    admin: 'Administrator',
  };
  return labels[role] ?? role;
}

export function Header() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, error } = useNotifications({ limit: 5, pollMs: 30000 });

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-card">
      <div className="flex h-12 items-center justify-end gap-1 px-4 lg:px-6">
        <ThemeToggle />
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground">
              <Bell className="h-[15px] w-[15px]" strokeWidth={1.5} />
              {unreadCount > 0 && (
                <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-foreground px-0.5 text-[9px] font-medium text-background">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="border-b border-border px-4 py-3">
              <p className="text-[13px] font-medium">Notifications</p>
              {unreadCount > 0 && (
                <p className="text-[11px] text-muted-foreground">{unreadCount} unread</p>
              )}
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.length === 0 && (
                <p className="px-4 py-6 text-center text-[12px] text-muted-foreground">
                  {error ? 'Could not load notifications. Restart the API with npm run dev:api.' : 'No notifications'}
                </p>
              )}
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => {
                    if (!notification.isRead) markRead(notification.id);
                    if (notification.linkUrl) navigate(notification.linkUrl);
                  }}
                  className={`block w-full border-b border-border px-4 py-3 text-left last:border-0 ${
                    !notification.isRead ? 'bg-muted/40' : ''
                  }`}
                >
                  <p className="text-[13px] font-medium leading-snug">{notification.title}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground line-clamp-2">{notification.message}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground">
                    {format(new Date(notification.timestamp), 'MMM d, h:mm a')}
                  </p>
                </button>
              ))}
            </div>
            <div className="border-t border-border p-2">
              <Button
                variant="ghost"
                className="h-8 w-full text-[12px] text-muted-foreground"
                size="sm"
                onClick={() => navigate('/notifications')}
              >
                View all
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 px-1.5 hover:bg-muted">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="bg-muted text-[10px] font-medium text-foreground">
                  {user ? getInitials(user.fullName) : 'U'}
                </AvatarFallback>
              </Avatar>
              <span className="hidden text-[13px] font-medium lg:inline">{user?.fullName?.split(' ')[0]}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="font-normal">
              <p className="text-[13px] font-medium">{user?.fullName}</p>
              <p className="text-[11px] text-muted-foreground">{user ? getRoleLabel(user.role) : ''}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px]" onClick={() => navigate('/profile-settings')}>
              <User className="mr-2 h-3.5 w-3.5" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="text-[13px]" onClick={() => navigate('/preferences')}>
              <Settings className="mr-2 h-3.5 w-3.5" />
              Preferences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-[13px] text-destructive focus:text-destructive" onClick={() => logout()}>
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <TopSubNav />
    </header>
  );
}
