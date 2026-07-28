import React from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Users, UserCog, LayoutDashboard } from 'lucide-react';

export function TeamManagement() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Team Management</h1>
          <p className="text-slate-600 mt-1">Manage your team members and assignments</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-brand" />
            <div>
              <CardTitle>Team Overview</CardTitle>
              <CardDescription>Workload, roles, and user administration</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Manage team members, roles, and workload from user management and your manager dashboard.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/user-management')}>
              <UserCog className="mr-2 h-4 w-4" />
              User & Access Management
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Manager Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/analytics')}>
              <Users className="mr-2 h-4 w-4" />
              Team Performance
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
