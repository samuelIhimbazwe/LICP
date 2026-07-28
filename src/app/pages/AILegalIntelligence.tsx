import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { Progress } from '../components/ui/progress';
import { Separator } from '../components/ui/separator';
import {
  Sparkles,
  Send,
  Search,
  FileText,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Download,
  Clock,
  TrendingUp,
  Lightbulb,
  Brain,
  Scale,
  Files,
  Shield,
  History,
} from 'lucide-react';
import { commonQueries } from '../data/aiData';
import { format } from 'date-fns';
import {
  useAI,
  type AiQueryResult,
  type AiRiskResult,
  type AiClauseResult,
  type AiCompareResult,
  type AiComplianceCheckResult,
} from '../hooks/useAI';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { SourceReferenceButton } from '../components/legal/CitationLinks';
import { copyToClipboard, downloadJsonFile, downloadTextFile } from '../lib/ui-actions';

function errMessage(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback;
}

export function AILegalIntelligence() {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [clauseText, setClauseText] = useState('');
  const [riskAction, setRiskAction] = useState('');
  const [docA, setDocA] = useState('');
  const [docB, setDocB] = useState('');
  const [activeTab, setActiveTab] = useState('research');
  const [chatMessages, setChatMessages] = useState<
    Array<{
      id: string;
      role: string;
      content: string;
      timestamp: Date;
      sources?: Array<{ id: string; title: string; url?: string; external?: boolean }>;
    }>
  >([]);
  const [aiResponse, setAiResponse] = useState<(AiQueryResult & { queryText?: string }) | null>(null);
  const [riskResult, setRiskResult] = useState<(AiRiskResult & { action?: string }) | null>(null);
  const [clauseResult, setClauseResult] = useState<(AiClauseResult & { clauseText?: string }) | null>(null);
  const [compareResult, setCompareResult] = useState<AiCompareResult | null>(null);
  const [complianceResult, setComplianceResult] = useState<AiComplianceCheckResult | null>(null);
  const [feedbackSent, setFeedbackSent] = useState<'helpful' | 'not_helpful' | null>(null);

  const {
    query: aiQuery,
    complianceCheck,
    assessRisk,
    analyzeClause,
    compareDocuments,
    sendFeedback,
    loadHistoryItem,
    history,
    stats,
    insights,
    loading,
  } = useAI();

  const getConfidenceBadge = (confidence: string, score: number) => {
    const colors: Record<string, string> = {
      very_high: 'bg-green-100 text-green-800 hover:bg-green-100',
      high: 'bg-brand/10 text-brand hover:bg-brand/10',
      medium: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
      low: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    };
    return (
      <Badge className={colors[confidence] ?? colors.medium}>
        {score}% Confidence • {confidence.replace('_', ' ')}
      </Badge>
    );
  };

  const getRiskBadge = (risk: string) => {
    const badges: Record<string, { label: string; className: string }> = {
      critical: { label: 'Critical Risk', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
      high: { label: 'High Risk', className: 'bg-orange-100 text-orange-800 hover:bg-orange-100' },
      medium: { label: 'Medium Risk', className: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100' },
      low: { label: 'Low Risk', className: 'bg-brand/10 text-brand hover:bg-brand/10' },
      minimal: { label: 'Minimal Risk', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
    };
    const badge = badges[risk] || { label: risk, className: 'bg-gray-100 text-gray-800' };
    return <Badge className={badge.className}>{badge.label}</Badge>;
  };

  const applyQueryResult = (result: AiQueryResult, submittedQuery: string) => {
    setAiResponse({ ...result, queryText: submittedQuery });
    setFeedbackSent(null);
    setChatMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content: submittedQuery, timestamp: new Date() },
      {
        id: result.id,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources.map((s) => ({
          id: s.id,
          title: s.title,
          url: s.url,
          external: s.external,
        })),
      },
    ]);
  };

  const handleQuerySubmit = async (text?: string) => {
    const submittedQuery = (text ?? query).trim();
    if (!submittedQuery) return;
    setQuery(submittedQuery);
    setIsProcessing(true);
    try {
      const result = await aiQuery(submittedQuery);
      applyQueryResult(result, submittedQuery);
    } catch (err) {
      toast.error(errMessage(err, 'AI query failed.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplianceCheck = async () => {
    const text = query.trim();
    if (!text) {
      toast.error('Enter a query to run a compliance check.');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await complianceCheck(text);
      setComplianceResult(result);
      setChatMessages((prev) => [
        ...prev,
        { id: `u-cc-${Date.now()}`, role: 'user', content: `Compliance check: ${text}`, timestamp: new Date() },
        {
          id: result.id ?? `cc-${Date.now()}`,
          role: 'assistant',
          content: result.summary,
          timestamp: new Date(),
        },
      ]);
      toast.success('Compliance check complete.');
    } catch (err) {
      toast.error(errMessage(err, 'Compliance check failed.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRiskAssess = async () => {
    if (!riskAction.trim()) {
      toast.error('Describe the action to assess.');
      return;
    }
    try {
      const result = await assessRisk(riskAction);
      setRiskResult({ ...result, action: riskAction });
    } catch (err) {
      toast.error(errMessage(err, 'Risk assessment failed.'));
    }
  };

  const handleClauseAnalyze = async () => {
    if (!clauseText.trim()) {
      toast.error('Paste a clause to analyze.');
      return;
    }
    try {
      const result = await analyzeClause(clauseText);
      setClauseResult({ ...result, clauseText });
    } catch (err) {
      toast.error(errMessage(err, 'Clause analysis failed.'));
    }
  };

  const handleCompare = async () => {
    if (!docA.trim() || !docB.trim()) {
      toast.error('Provide both document versions.');
      return;
    }
    try {
      setCompareResult(await compareDocuments(docA, docB));
    } catch (err) {
      toast.error(errMessage(err, 'Document comparison failed.'));
    }
  };

  const handleHistoryClick = async (id: string) => {
    try {
      const item = await loadHistoryItem(id);
      const sources = Array.isArray(item.sources)
        ? (item.sources as AiQueryResult['sources'])
        : [];
      setQuery(item.query);
      setAiResponse({
        id: item.id,
        answer: item.answer ?? item.response,
        summary: (item.answer ?? item.response).slice(0, 240),
        confidence: item.confidence,
        confidenceLevel:
          item.confidence >= 0.85
            ? 'very_high'
            : item.confidence >= 0.7
              ? 'high'
              : item.confidence >= 0.5
                ? 'medium'
                : 'low',
        sources,
        processingTimeMs: (item as { processingTimeMs?: number }).processingTimeMs,
        queryText: item.query,
      });
      setFeedbackSent(
        item.feedback === 'helpful' ? 'helpful' : item.feedback ? 'not_helpful' : null
      );
      setActiveTab('research');
      toast.success('Loaded previous query.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not load history item.'));
    }
  };

  const handleFeedback = async (helpful: boolean) => {
    if (!aiResponse) return;
    try {
      await sendFeedback(aiResponse.id, helpful);
      setFeedbackSent(helpful ? 'helpful' : 'not_helpful');
      toast.success(helpful ? 'Thanks for your feedback!' : 'Feedback recorded.');
    } catch (err) {
      toast.error(errMessage(err, 'Could not save feedback.'));
    }
  };

  const busy = isProcessing || loading;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-brand to-[#8a7355] rounded-lg flex items-center justify-center">
            <Sparkles className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">AI Legal Intelligence</h1>
            <p className="text-slate-600">Research, risk, clause analysis, and document comparison against your live data</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queries Today</CardTitle>
            <Search className="h-4 w-4 text-brand" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.queriesToday ?? 0}</div>
            <p className="text-xs text-slate-600">{stats?.totalQueries ?? 0} total for you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Confidence</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgConfidence ?? 0}%</div>
            <p className="text-xs text-slate-600">From your recent queries</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
            <Clock className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseSeconds ? `${stats.avgResponseSeconds}s` : '—'}</div>
            <p className="text-xs text-slate-600">Measured processing time</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Helpful Rate</CardTitle>
            <ThumbsUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.helpfulRate ?? 0}%</div>
            <p className="text-xs text-slate-600">From rated answers</p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="research">Research Assistant</TabsTrigger>
          <TabsTrigger value="risk">Risk Assessment</TabsTrigger>
          <TabsTrigger value="clause">Clause Analysis</TabsTrigger>
          <TabsTrigger value="compare">Document Compare</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="research" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5 text-purple-600" />
                    Legal Research Assistant
                  </CardTitle>
                  <CardDescription>
                    Answers are grounded in your Knowledge Base and compliance obligations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="border rounded-lg p-4 space-y-4 max-h-96 overflow-y-auto bg-slate-50">
                    {chatMessages.length === 0 && !isProcessing && (
                      <p className="text-sm text-slate-500 text-center py-8">
                        Ask a legal or compliance question to start. Results cite live sources from your organization.
                      </p>
                    )}
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'assistant' && (
                          <div className="flex items-start gap-3 max-w-[85%]">
                            <div className="w-8 h-8 bg-gradient-to-br from-brand to-[#8a7355] rounded-full flex items-center justify-center flex-shrink-0">
                              <Sparkles className="h-4 w-4 text-white" />
                            </div>
                            <div className="bg-white border rounded-lg p-3 shadow-sm">
                              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                              {msg.sources && msg.sources.length > 0 && (
                                <div className="mt-2 pt-2 border-t">
                                  <p className="text-xs font-semibold mb-1">Sources:</p>
                                  {msg.sources.slice(0, 3).map((source) => {
                                    const href =
                                      source.url ||
                                      `/knowledge-base?q=${encodeURIComponent(source.title)}`;
                                    return (
                                    <div key={source.id} className="text-xs text-slate-600 mb-1">
                                      •{' '}
                                      {source.external && source.url ? (
                                        <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                                          {source.title}
                                        </a>
                                      ) : (
                                        <Link to={href} className="text-brand hover:underline">
                                          {source.title}
                                        </Link>
                                      )}
                                    </div>
                                    );
                                  })}
                                </div>
                              )}
                              <p className="text-xs text-slate-500 mt-2">{format(msg.timestamp, 'HH:mm')}</p>
                            </div>
                          </div>
                        )}
                        {msg.role === 'user' && (
                          <div className="bg-brand text-brand-foreground rounded-lg p-3 max-w-[85%]">
                            <p className="text-sm">{msg.content}</p>
                            <p className="text-xs text-brand-foreground/80 mt-1">{format(msg.timestamp, 'HH:mm')}</p>
                          </div>
                        )}
                      </div>
                    ))}
                    {isProcessing && (
                      <div className="flex justify-start">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-gradient-to-br from-brand to-[#8a7355] rounded-full flex items-center justify-center animate-pulse">
                            <Sparkles className="h-4 w-4 text-white" />
                          </div>
                          <div className="bg-white border rounded-lg p-3">
                            <span className="text-sm text-slate-600">Analyzing your knowledge base…</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about contracts, obligations, users, integrations, reports, regulations…"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleQuerySubmit()}
                      disabled={busy}
                    />
                    <Button onClick={() => handleQuerySubmit()} disabled={busy || !query.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleComplianceCheck} disabled={busy || !query.trim()}>
                    <Shield className="mr-2 h-4 w-4" />
                    Run Compliance Check
                  </Button>
                </CardContent>
              </Card>

              {complianceResult && (
                <Card>
                  <CardHeader>
                    <CardTitle>Compliance Check Results</CardTitle>
                    <CardDescription>{complianceResult.summary}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {complianceResult.items.map((item) => (
                      <div key={item.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm">{item.title}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {item.category.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{item.explanation}</p>
                        <p className="text-xs text-slate-500 mt-1">Status: {item.status}</p>
                      </div>
                    ))}
                    {complianceResult.regulations.length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs font-semibold mb-2">Related knowledge documents</p>
                        <div className="flex flex-wrap gap-2">
                          {complianceResult.regulations.map((r) => (
                            <Badge key={r.id} variant="secondary" className="text-xs">
                              {r.title}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {aiResponse && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <CardTitle>Detailed Analysis</CardTitle>
                      <div className="flex items-center gap-2">
                        {aiResponse.usedExternalLlm && (
                          <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200">
                            External fallback
                          </Badge>
                        )}
                        {getConfidenceBadge(
                          aiResponse.confidenceLevel,
                          Math.round(aiResponse.confidence * 100)
                        )}
                        <Badge variant="outline">
                          <Clock className="mr-1 h-3 w-3" />
                          {((aiResponse.processingTimeMs ?? 0) / 1000).toFixed(1)}s
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiResponse.queryText && (
                      <div>
                        <h3 className="font-semibold mb-2">Query</h3>
                        <p className="text-sm text-slate-700">{aiResponse.queryText}</p>
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold mb-2">Answer</h3>
                      <div className="text-sm text-slate-700 whitespace-pre-wrap">{aiResponse.answer}</div>
                    </div>

                    <Separator />

                    <div>
                      <h3 className="font-semibold mb-3">Sources & Citations</h3>
                      {aiResponse.sources.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No matching documents or obligations were found. Add content to the Knowledge Base or refine your query.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {aiResponse.sources.map((source, idx) => (
                            <div key={`${source.id}-${idx}`} className="p-3 border rounded-lg">
                              <div className="flex items-start justify-between mb-2 gap-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-sm mb-1">{source.title}</h4>
                                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    {source.type && (
                                      <Badge variant="outline" className="text-xs">
                                        {source.type}
                                      </Badge>
                                    )}
                                    {source.jurisdiction && (
                                      <Badge variant="secondary" className="text-xs">
                                        {source.jurisdiction}
                                      </Badge>
                                    )}
                                  </div>
                                  {source.excerpt && (
                                    <p className="text-xs text-slate-600 italic">&quot;{source.excerpt}&quot;</p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-xs text-slate-500 mb-1">Relevance</div>
                                  <Progress value={source.relevanceScore ?? Math.max(50, 90 - idx * 8)} className="w-16 h-2" />
                                  <div className="text-xs font-semibold mt-1">
                                    {source.relevanceScore ?? Math.max(50, 90 - idx * 8)}%
                                  </div>
                                </div>
                              </div>
                              <SourceReferenceButton
                                  title={source.title}
                                  href={source.url}
                                  external={source.external}
                                />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {aiResponse.recommendations && aiResponse.recommendations.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="font-semibold mb-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4 text-yellow-600" />
                            Recommendations
                          </h3>
                          <ul className="space-y-2">
                            {aiResponse.recommendations.map((rec, idx) => (
                              <li key={idx} className="flex items-start gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div className="flex items-center justify-between pt-2 flex-wrap gap-3">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(aiResponse.answer, 'Answer copied')}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadJsonFile('ai-response.json', aiResponse)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                      <div className="flex gap-2 items-center">
                        <p className="text-sm text-slate-600 mr-2">Was this helpful?</p>
                        <Button
                          size="sm"
                          variant={feedbackSent === 'helpful' ? 'default' : 'outline'}
                          onClick={() => handleFeedback(true)}
                        >
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant={feedbackSent === 'not_helpful' ? 'default' : 'outline'}
                          onClick={() => handleFeedback(false)}
                        >
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Suggested Queries</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {commonQueries.slice(0, 5).map((q, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleQuerySubmit(q)}
                      disabled={busy}
                      className="w-full text-left text-sm p-2 rounded hover:bg-slate-50 border disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <History className="h-4 w-4" />
                    Recent Queries
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {history.length === 0 && (
                    <p className="text-xs text-slate-500">No queries yet. Ask a question to build history.</p>
                  )}
                  {history.slice(0, 8).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleHistoryClick(item.id)}
                      className="w-full text-left text-sm p-2 rounded hover:bg-slate-50 border"
                    >
                      <p className="line-clamp-2">{item.query}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(item.createdAt), 'MMM d, HH:mm')} · {Math.round(item.confidence * 100)}%
                      </p>
                    </button>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-orange-600" />
                AI Risk Assessment
              </CardTitle>
              <CardDescription>Scores risk against your live compliance register</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Describe the action or decision you want to assess</Label>
                <Textarea
                  placeholder="E.g., 'Implementing a 2-year non-compete clause for new employees in Rwanda'"
                  rows={3}
                  value={riskAction}
                  onChange={(e) => setRiskAction(e.target.value)}
                />
              </div>
              <Button onClick={handleRiskAssess} disabled={busy || !riskAction.trim()}>
                <AlertTriangle className="mr-2 h-4 w-4" />
                {busy ? 'Assessing…' : 'Assess Risk'}
              </Button>

              {!riskResult && (
                <p className="text-sm text-slate-500 py-6 text-center border rounded-lg">
                  Results appear here after you run an assessment.
                </p>
              )}

              {riskResult && (
                <div className="mt-2 space-y-4">
                  <div className="p-4 border rounded-lg space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold">Risk Assessment Results</h3>
                      <div className="flex items-center gap-3">
                        {getRiskBadge(riskResult.riskLevel)}
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">{riskResult.score}</div>
                          <div className="text-xs text-slate-500">Risk Score</div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-semibold text-sm mb-2">Action Assessed</h4>
                      <p className="text-sm text-slate-700">{riskResult.action}</p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold text-sm mb-3">Risk Factors</h4>
                      <div className="space-y-3">
                        {riskResult.factors.map((factor, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <h5 className="font-medium text-sm">{factor.name}</h5>
                              {getRiskBadge(factor.severity)}
                            </div>
                            {factor.description && (
                              <p className="text-sm text-slate-600 mb-2">{factor.description}</p>
                            )}
                            <div className="flex items-center gap-4 text-xs mb-2">
                              {factor.likelihood && (
                                <div>
                                  <span className="text-slate-500">Likelihood:</span>
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    {factor.likelihood}
                                  </Badge>
                                </div>
                              )}
                              {factor.impact && (
                                <div>
                                  <span className="text-slate-500">Impact:</span>
                                  <Badge variant="outline" className="ml-1 text-xs">
                                    {factor.impact}
                                  </Badge>
                                </div>
                              )}
                            </div>
                            <div className="pt-2 border-t bg-brand/5 p-2 rounded">
                              <p className="text-xs font-semibold mb-1">Mitigation:</p>
                              <p className="text-xs text-slate-700">{factor.mitigation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {riskResult.complianceIssues && riskResult.complianceIssues.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h4 className="font-semibold text-sm mb-3">Related Compliance Items</h4>
                          <div className="space-y-3">
                            {riskResult.complianceIssues.map((issue) => (
                              <div key={issue.id} className="p-3 border rounded-lg">
                                <div className="flex items-center gap-2 mb-2">
                                  <FileText className="h-4 w-4 text-brand" />
                                  <h5 className="font-medium text-sm">{issue.title}</h5>
                                  {issue.category === 'compliant' && (
                                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                                  )}
                                  {issue.category === 'non_compliant' && (
                                    <AlertTriangle className="h-4 w-4 text-red-600" />
                                  )}
                                  {(issue.category === 'unclear' || !issue.category) && (
                                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                                  )}
                                </div>
                                <p className="text-sm text-slate-700">{issue.description}</p>
                                {issue.status && (
                                  <p className="text-xs text-slate-500 mt-1">Status: {issue.status}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}

                    <Separator />

                    <div>
                      <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                        <Lightbulb className="h-4 w-4 text-yellow-600" />
                        Recommendations
                      </h4>
                      <ul className="space-y-2">
                        {riskResult.recommendations.map((rec, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t flex-wrap gap-2">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(JSON.stringify(riskResult, null, 2), 'Risk report copied')
                          }
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Report
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadJsonFile('risk-assessment.json', riskResult)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Export
                        </Button>
                      </div>
                      {getConfidenceBadge(
                        riskResult.confidence >= 0.8 ? 'high' : 'medium',
                        Math.round(riskResult.confidence * 100)
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clause" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Scale className="h-5 w-5 text-brand" />
                Contract Clause Analysis
              </CardTitle>
              <CardDescription>Detect risky terms and get safer wording suggestions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Paste contract clause to analyze</Label>
                <Textarea
                  placeholder="Paste the clause text here..."
                  value={clauseText}
                  onChange={(e) => setClauseText(e.target.value)}
                  rows={5}
                />
              </div>
              <Button onClick={handleClauseAnalyze} disabled={busy || !clauseText.trim()}>
                <Search className="mr-2 h-4 w-4" />
                {busy ? 'Analyzing…' : 'Analyze Clause'}
              </Button>

              {!clauseResult && (
                <p className="text-sm text-slate-500 py-6 text-center border rounded-lg">
                  Paste a clause and click Analyze to see live results.
                </p>
              )}

              {clauseResult && (
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Analysis Results</h3>
                    <div className="flex items-center gap-3">
                      {getRiskBadge(clauseResult.riskLevel)}
                      <div className="text-right">
                        <div className="text-2xl font-bold text-orange-600">{clauseResult.score}</div>
                        <div className="text-xs text-slate-500">Risk Score</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs font-semibold mb-1">Analyzed Clause:</p>
                    <p className="text-sm text-slate-700 italic whitespace-pre-wrap">
                      &quot;{clauseResult.clauseText}&quot;
                    </p>
                    {clauseResult.clauseType && (
                      <Badge variant="outline" className="mt-2">
                        {clauseResult.clauseType}
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h4 className="font-semibold text-sm mb-3">Identified Issues</h4>
                    {clauseResult.issues.length === 0 ? (
                      <p className="text-sm text-slate-500">No high-risk patterns detected.</p>
                    ) : (
                      <div className="space-y-3">
                        {clauseResult.issues.map((issue, idx) => (
                          <div key={idx} className="p-3 border rounded-lg">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline">{issue.type}</Badge>
                              {getRiskBadge(issue.severity)}
                            </div>
                            <p className="text-xs text-slate-500 mb-1">{issue.location}</p>
                            {issue.description && (
                              <p className="text-sm text-slate-700 mb-2">{issue.description}</p>
                            )}
                            <div className="bg-green-50 p-2 rounded">
                              <p className="text-xs font-semibold mb-1">Recommendation:</p>
                              <p className="text-xs text-slate-700">{issue.recommendation}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {clauseResult.suggestions.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Suggestions</h4>
                      <ul className="space-y-2">
                        {clauseResult.suggestions.map((s, idx) => (
                          <li key={idx} className="text-sm flex gap-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {clauseResult.alternativeLanguage && (
                    <div className="p-3 border rounded-lg bg-brand/5">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-sm">Suggested Alternative Language</h4>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            copyToClipboard(clauseResult.alternativeLanguage ?? '', 'Alternative text copied')
                          }
                        >
                          <Copy className="mr-2 h-3 w-3" />
                          Copy
                        </Button>
                      </div>
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">
                        {clauseResult.alternativeLanguage}
                      </p>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadJsonFile('clause-analysis.json', clauseResult)}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Files className="h-5 w-5 text-brand" />
                Document Comparison
              </CardTitle>
              <CardDescription>Line-level diff of two document versions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Original document</Label>
                  <Textarea
                    rows={8}
                    value={docA}
                    onChange={(e) => setDocA(e.target.value)}
                    placeholder="Paste original text…"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Revised document</Label>
                  <Textarea
                    rows={8}
                    value={docB}
                    onChange={(e) => setDocB(e.target.value)}
                    placeholder="Paste revised text…"
                  />
                </div>
              </div>
              <Button onClick={handleCompare} disabled={busy || !docA.trim() || !docB.trim()}>
                <Search className="mr-2 h-4 w-4" />
                {busy ? 'Comparing…' : 'Compare Documents'}
              </Button>

              {!compareResult && (
                <p className="text-sm text-slate-500 py-6 text-center border rounded-lg">
                  Paste both versions and compare to see additions, deletions, and modifications.
                </p>
              )}

              {compareResult && (
                <div className="space-y-4 border rounded-lg p-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-green-600">{compareResult.additions}</div>
                      <div className="text-xs text-slate-500">Additions</div>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-red-600">{compareResult.deletions}</div>
                      <div className="text-xs text-slate-500">Deletions</div>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">{compareResult.modifications}</div>
                      <div className="text-xs text-slate-500">Modifications</div>
                    </div>
                    <div className="p-3 border rounded-lg text-center">
                      <div className="text-2xl font-bold text-brand">{compareResult.similarityScore}%</div>
                      <div className="text-xs text-slate-500">Similarity</div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-700">{compareResult.summary}</p>

                  <div className="space-y-2 max-h-80 overflow-y-auto">
                    {compareResult.changes.map((change, idx) => (
                      <div key={idx} className="p-3 border rounded-lg text-sm">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="capitalize">
                            {change.type}
                          </Badge>
                          <span className="text-xs text-slate-500">{change.section}</span>
                          {change.significance && (
                            <Badge variant="secondary" className="text-xs">
                              {change.significance}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{change.context}</p>
                        {change.originalText != null && (
                          <p className="text-xs text-red-700 line-through whitespace-pre-wrap">
                            {change.originalText}
                          </p>
                        )}
                        {change.newText != null && (
                          <p className="text-xs text-green-700 whitespace-pre-wrap">{change.newText}</p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => downloadJsonFile('document-redline.json', compareResult)}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        downloadTextFile(
                          'document-diff.txt',
                          [
                            compareResult.summary,
                            '',
                            ...compareResult.changes.map(
                              (c) =>
                                `[${c.type}] ${c.section}: ${c.originalText ?? ''} → ${c.newText ?? ''}`
                            ),
                          ].join('\n')
                        )
                      }
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export TXT
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyToClipboard(compareResult.summary, 'Summary copied')}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copy Summary
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-600" />
                AI-Generated Insights
              </CardTitle>
              <CardDescription>Derived from your obligations, knowledge base, and recent queries</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-8">
                    Insights will appear as you add compliance data and run AI queries.
                  </p>
                )}
                {insights.map((insight) => {
                  const relevance =
                    insight.priority === 'high' ? 92 : insight.priority === 'medium' ? 75 : 55;
                  return (
                    <div key={insight.id} className="p-4 border rounded-lg">
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            {insight.type === 'trend' && <TrendingUp className="h-4 w-4 text-brand" />}
                            {insight.type === 'risk' && <AlertTriangle className="h-4 w-4 text-orange-600" />}
                            {insight.type === 'opportunity' && <Lightbulb className="h-4 w-4 text-green-600" />}
                            {insight.type === 'alert' && <AlertCircle className="h-4 w-4 text-red-600" />}
                            <h3 className="font-semibold">{insight.title}</h3>
                            <Badge variant="outline" className="text-xs capitalize">
                              {insight.type}
                            </Badge>
                            <Badge variant="secondary" className="text-xs capitalize">
                              {insight.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-700 mb-3">{insight.description}</p>
                        </div>
                        <div className="ml-2">
                          <Progress value={relevance} className="w-16 h-2" />
                          <div className="text-xs text-center mt-1 text-slate-500">{relevance}%</div>
                        </div>
                      </div>
                      {insight.sources.length > 0 && (
                        <div className="pt-3 border-t">
                          <p className="text-xs font-semibold mb-2">Sources:</p>
                          <div className="flex flex-wrap gap-2">
                            {insight.sources.map((source, idx) => {
                              const label = typeof source === 'string' ? source : source.label;
                              const href =
                                typeof source === 'string'
                                  ? `/knowledge-base?q=${encodeURIComponent(source)}`
                                  : source.href;
                              return (
                                <Link key={idx} to={href}>
                                  <Badge variant="secondary" className="text-xs hover:bg-brand/10 cursor-pointer">
                                    {label}
                                  </Badge>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
