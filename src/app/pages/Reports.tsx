import React from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BarChart3, Shield, TrendingUp } from 'lucide-react';

export function Reports() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-slate-600 mt-1">Generate and view compliance reports</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BarChart3 className="h-8 w-8 text-brand" />
            <div>
              <CardTitle>Compliance Reports</CardTitle>
              <CardDescription>Analytics, trends, and compliance summaries</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            View detailed analytics and compliance tracking data from the modules below.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/analytics')}>
              <TrendingUp className="mr-2 h-4 w-4" />
              Open Analytics
            </Button>
            <Button variant="outline" onClick={() => navigate('/compliance-tracking')}>
              <Shield className="mr-2 h-4 w-4" />
              Compliance Tracking
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <BarChart3 className="mr-2 h-4 w-4" />
              Dashboard Overview
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
