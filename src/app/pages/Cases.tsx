import React from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Briefcase, FileText, Scale } from 'lucide-react';

export function Cases() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Cases</h1>
          <p className="text-slate-600 mt-1">Manage your legal cases and proceedings</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Briefcase className="h-8 w-8 text-brand" />
            <div>
              <CardTitle>Case Management</CardTitle>
              <CardDescription>Track matters, hearings, and case documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Case workflows are managed through contracts and the knowledge base. Use the links below to
            open active matters and related documents.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/contracts')}>
              <Scale className="mr-2 h-4 w-4" />
              Open Contract Management
            </Button>
            <Button variant="outline" onClick={() => navigate('/knowledge-base')}>
              <FileText className="mr-2 h-4 w-4" />
              Browse Case Documents
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              <Briefcase className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
