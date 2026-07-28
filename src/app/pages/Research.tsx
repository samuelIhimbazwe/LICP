import React from 'react';
import { useNavigate } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { BookOpen, Brain, Search } from 'lucide-react';

export function Research() {
  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Legal Research</h1>
          <p className="text-slate-600 mt-1">Access legal research tools and resources</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="h-8 w-8 text-brand" />
            <div>
              <CardTitle>Research Tools</CardTitle>
              <CardDescription>Search statutes, precedents, and firm knowledge</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-slate-600">
            Use the knowledge base for document search or AI Intelligence for guided legal research and analysis.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/knowledge-base')}>
              <Search className="mr-2 h-4 w-4" />
              Open Knowledge Base
            </Button>
            <Button variant="outline" onClick={() => navigate('/ai-intelligence')}>
              <Brain className="mr-2 h-4 w-4" />
              AI Legal Research
            </Button>
            <Button variant="outline" onClick={() => navigate('/regulatory-updates')}>
              <BookOpen className="mr-2 h-4 w-4" />
              Regulatory Updates
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
