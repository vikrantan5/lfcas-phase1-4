import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../../services/api';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { BookOpen, FileText, Scale, Users, ExternalLink, Clock, Search, Filter, Loader2, BookMarked } from 'lucide-react';
import { useToast } from '../../hooks/use-toast';

const LegalResources = () => {
  const { toast } = useToast();
  const [resources, setResources] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('all');

  useEffect(() => {
    loadResources();
  }, [activeCategory]);

  const loadResources = async () => {
    setLoading(true);
    try {
      const response = await dashboardAPI.getLegalResources(activeCategory);
      setResources(response.data.resources || []);
      setCategories(response.data.categories || []);
    } catch (error) {
      console.error('Failed to load legal resources:', error);
      toast({ title: "Error", description: "Failed to load legal resources", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category) => {
    const labels = {
      'all': 'All Resources',
      'divorce': 'Divorce',
      'child_custody': 'Child Custody',
      'alimony': 'Alimony',
      'domestic_violence': 'Domestic Violence',
      'general': 'General'
    };
    return labels[category] || category;
  };

  const getContentTypeIcon = (type) => {
    const icons = {
      'article': FileText,
      'guide': BookOpen,
      'checklist': BookMarked,
      'glossary': BookOpen
    };
    return icons[type] || FileText;
  };

  const getContentTypeColor = (type) => {
    const colors = {
      'article': 'bg-blue-100 text-blue-700',
      'guide': 'bg-green-100 text-green-700',
      'checklist': 'bg-purple-100 text-purple-700',
      'glossary': 'bg-amber-100 text-amber-700'
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="legal-resources-page">
        <div className="flex justify-center items-center py-20">
          <Loader2 className="animate-spin text-violet-600" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-testid="legal-resources-page">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Legal Resources</h1>
        <p className="text-slate-600 mt-1">Learn about your rights and legal procedures</p>
      </div>

      {/* Featured Banner */}
      <Card className="p-8 bg-gradient-to-r from-violet-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-bold mb-2">Legal Knowledge Center</h2>
            <p className="text-violet-100 mb-4">
              Access comprehensive guides, articles, and resources to understand your legal rights and procedures
            </p>
            <Button variant="secondary" size="sm" className="bg-white text-violet-600 hover:bg-violet-50">
              <BookOpen size={16} className="mr-2" />
              Start Learning
            </Button>
          </div>
          <div className="hidden md:block">
            <Scale size={80} className="text-violet-300 opacity-50" />
          </div>
        </div>
      </Card>

      {/* Category Tabs */}
      <Card className="p-6">
        <Tabs value={activeCategory} onValueChange={setActiveCategory}>
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            {categories.map((category) => (
              <TabsTrigger key={category} value={category} data-testid={`category-${category}`}>
                {getCategoryLabel(category)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </Card>

      {/* Resources Grid */}
      {resources.length === 0 ? (
        <Card className="p-12 text-center">
          <BookOpen className="mx-auto text-slate-300 mb-4" size={64} />
          <h3 className="text-xl font-semibold text-slate-700 mb-2">No Resources Found</h3>
          <p className="text-slate-500">Try selecting a different category</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => {
            const IconComponent = getContentTypeIcon(resource.content_type);
            return (
              <Card key={resource.id} className="overflow-hidden hover:shadow-lg transition-shadow" data-testid={`resource-${resource.id}`}>
                {/* Thumbnail */}
                <div className="h-48 bg-slate-200 relative overflow-hidden">
                  {resource.thumbnail ? (
                    <img
                      src={resource.thumbnail}
                      alt={resource.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-100 to-purple-100">
                      <IconComponent size={48} className="text-violet-600" />
                    </div>
                  )}
                  <Badge className={`absolute top-3 right-3 ${getContentTypeColor(resource.content_type)}`}>
                    {resource.content_type}
                  </Badge>
                </div>

                {/* Content */}
                <div className="p-6">
                  <h3 className="font-semibold text-lg text-slate-900 mb-2 line-clamp-2">
                    {resource.title}
                  </h3>
                  <p className="text-sm text-slate-600 mb-4 line-clamp-3">
                    {resource.description}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {resource.tags?.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Clock size={14} />
                      <span>{resource.reading_time}</span>
                    </div>
                    <Button size="sm" variant="ghost" className="text-violet-600 hover:text-violet-700">
                      Read More
                      <ExternalLink size={14} className="ml-2" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Help Section */}
      <Card className="p-6 bg-slate-50 border-slate-200">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-violet-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Users size={24} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900 mb-2">Need Personalized Legal Advice?</h3>
            <p className="text-slate-600 mb-4">
              While these resources are educational, your case is unique. Connect with a verified advocate for personalized guidance.
            </p>
            <Button className="bg-violet-600 hover:bg-violet-700">
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
