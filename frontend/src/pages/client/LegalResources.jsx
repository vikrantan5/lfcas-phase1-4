import React, { useState } from 'react';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { BookOpen, FileText, Scale, Users, ExternalLink, Search, Gavel, Shield, Library, Landmark } from 'lucide-react';

const RESOURCES = [
  {
    id: 'sci',
    title: 'Supreme Court of India',
    description: 'Access case status, cause lists, daily orders, and landmark judgments from the apex court.',
    url: 'https://main.sci.gov.in',
    image: 'https://images.unsplash.com/photo-1589391886645-d51941baf7fb?w=800&auto=format&fit=crop&q=60',
    icon: Landmark,
    category: 'Courts',
    tag: 'Official',
  },
  {
    id: 'ecourts',
    title: 'eCourts Services',
    description: 'Check case status, orders, judgments and cause lists across District & Subordinate courts in India.',
    url: 'https://ecourts.gov.in/ecourts_home/',
    image: 'https://images.unsplash.com/photo-1505664194779-8beaceb93744?w=800&auto=format&fit=crop&q=60',
    icon: Gavel,
    category: 'Case Status',
    tag: 'Official',
  },
  {
    id: 'nalsa',
    title: 'NALSA — Free Legal Aid',
    description: 'National Legal Services Authority: free legal aid, Lok Adalats & women / child schemes.',
    url: 'https://nalsa.gov.in',
    image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?w=800&auto=format&fit=crop&q=60',
    icon: Shield,
    category: 'Legal Aid',
    tag: 'Free Help',
  },
  {
    id: 'indiacode',
    title: 'India Code — Bare Acts',
    description: 'Official repository of Central & State Acts including IPC, CrPC, Hindu Marriage Act & DV Act.',
    url: 'https://www.indiacode.nic.in',
    image: 'https://images.unsplash.com/photo-1568667256549-094345857637?w=800&auto=format&fit=crop&q=60',
    icon: Library,
    category: 'Statutes',
    tag: 'Reference',
  },
  {
    id: 'ncw',
    title: 'National Commission for Women',
    description: 'Complaint portal, helpline and guidance on domestic violence, dowry harassment & cyber crimes.',
    url: 'https://ncw.nic.in',
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&auto=format&fit=crop&q=60',
    icon: Users,
    category: 'Women Rights',
    tag: 'Helpline',
  },
  {
    id: 'hma',
    title: 'Hindu Marriage Act, 1955',
    description: 'Complete text of the Hindu Marriage Act covering divorce, restitution, and maintenance.',
    url: 'https://www.indiacode.nic.in/handle/123456789/1560',
    image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=800&auto=format&fit=crop&q=60',
    icon: BookOpen,
    category: 'Divorce',
    tag: 'Act',
  },
  {
    id: 'dvact',
    title: 'Protection of Women from DV Act, 2005',
    description: 'Legal framework protecting women from physical, emotional, sexual & economic abuse in the home.',
    url: 'https://www.indiacode.nic.in/handle/123456789/2031',
    image: 'https://images.unsplash.com/photo-1590012314607-cda9d9b699ae?w=800&auto=format&fit=crop&q=60',
    icon: Shield,
    category: 'DV',
    tag: 'Act',
  },
  {
    id: 'custody',
    title: 'Child Custody — Guide',
    description: 'Understand custody types (physical, joint, legal) and the Guardians and Wards Act, 1890.',
    url: 'https://www.indiacode.nic.in/handle/123456789/2318',
    image: 'https://images.unsplash.com/photo-1484820540004-14229fe36ca4?w=800&auto=format&fit=crop&q=60',
    icon: FileText,
    category: 'Custody',
    tag: 'Guide',
  },
  {
    id: 'legalhelp',
    title: 'Ministry of Law & Justice',
    description: 'Official notifications, gazettes and updates from the Ministry of Law & Justice, Govt. of India.',
    url: 'https://lawmin.gov.in',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800&auto=format&fit=crop&q=60',
    icon: Scale,
    category: 'Govt',
    tag: 'Official',
  },
];

const CATEGORIES = ['All', 'Courts', 'Case Status', 'Legal Aid', 'Statutes', 'Women Rights', 'Divorce', 'DV', 'Custody', 'Govt'];

const LegalResources = () => {
  const [activeCategory, setActiveCategory] = useState('All');
  const [query, setQuery] = useState('');

  const filtered = RESOURCES.filter((r) => {
    const matchCat = activeCategory === 'All' || r.category === activeCategory;
    const q = query.trim().toLowerCase();
    const matchQ = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q);
    return matchCat && matchQ;
  });

  return (
    <div className="p-6 space-y-6" data-testid="legal-resources-page">
      {/* Header Banner */}
      <Card className="p-8 bg-gradient-to-r from-indigo-700 via-violet-700 to-purple-700 text-white border-none overflow-hidden relative">
        <div className="relative z-10 flex items-center justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">Legal Knowledge Center</h1>
            <p className="text-violet-100 max-w-2xl">
              Verified, official portals and guides — courts, statutes, legal aid and women's rights. Everything you need, in one place.
            </p>
          </div>
          <Scale size={96} className="text-white/20 hidden md:block" />
        </div>
      </Card>

      {/* Search + Category Filters */}
      <div className="flex flex-col gap-4">
        <div className="relative max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resources (e.g. divorce, custody, dowry)..."
            className="pl-10"
            data-testid="resources-search"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setActiveCategory(c)}
              data-testid={`category-${c.toLowerCase().replace(/s/g, '-')}`}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeCategory === c
                  ? 'bg-violet-600 text-white shadow'
                  : 'bg-white text-slate-700 border border-slate-200 hover:border-violet-400 hover:text-violet-700'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Resource Cards Grid */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Resources Found</h3>
          <p className="text-slate-500">Try a different search or category</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((r) => {
            const Icon = r.icon;
            return (
              <Card
                key={r.id}
                className="overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group"
                data-testid={`resource-card-${r.id}`}
              >
                <div className="h-44 bg-slate-200 relative overflow-hidden">
                  <img
                    src={r.image}
                    alt={r.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  <Badge className="absolute top-3 right-3 bg-white text-violet-700 border-0 shadow">
                    {r.tag}
                  </Badge>
                  <div className="absolute bottom-3 left-3 w-10 h-10 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center">
                    <Icon size={20} className="text-violet-700" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="text-xs uppercase tracking-wider text-violet-600 font-semibold mb-1">
                    {r.category}
                  </div>
                  <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-2">
                    {r.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">{r.description}</p>
                  <Button
                    onClick={() => window.open(r.url, '_blank', 'noopener,noreferrer')}
                    className="w-full bg-violet-600 hover:bg-violet-700 text-white"
                    data-testid={`open-resource-${r.id}`}
                  >
                    Visit Resource
                    <ExternalLink size={14} className="ml-2" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help CTA */}
      <Card className="p-6 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users size={24} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-2">Need Personalized Legal Advice?</h3>
            <p className="text-slate-600 mb-4">
              These resources are educational. For your specific case, connect with a verified advocate on LFCAS.
            </p>
            <Button
              className="bg-violet-600 hover:bg-violet-700"
              onClick={() => (window.location.href = '/client/find-advocates')}
              data-testid="find-advocate-cta"
            >
              <Search size={16} className="mr-2" />
              Find an Advocate
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default LegalResources;
