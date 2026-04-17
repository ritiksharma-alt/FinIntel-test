import { NewsItem } from '../types';
import { RSS_FEEDS } from '../constants';

interface ProxyStrategy {
  name: string;
  url: (feedUrl: string) => string;
  type: 'json_wrapped' | 'json_converted' | 'xml_raw';
}

const STRATEGIES: ProxyStrategy[] = [
  {
    // Strategy 0: Local Express Proxy (Most Reliable)
    // Uses server-side axios to bypass CORS completely.
    name: 'LocalProxy',
    url: (u) => `/api/rss-proxy?url=${encodeURIComponent(u)}`,
    type: 'xml_raw'
  },
  {
    // Strategy 1: AllOrigins (Returns JSON with 'contents' holding the XML string)
    // Reliable, free, decent limits.
    name: 'AllOrigins',
    url: (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
    type: 'json_wrapped'
  },
  {
    // Strategy 2: RSS2JSON (Returns Parsed JSON)
    // Very reliable, handles parsing for us. Free tier has limits but good fallback.
    name: 'RSS2JSON',
    url: (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`,
    type: 'json_converted'
  },
  {
    // Strategy 3: CORSProxy (Returns Raw XML)
    // Fast, but often blocked or rate-limited.
    name: 'CORSProxy',
    url: (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    type: 'xml_raw'
  },
  {
    // Strategy 4: CodeTabs (Returns Raw XML)
    // Another CORS proxy, good fallback.
    name: 'CodeTabs',
    url: (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
    type: 'xml_raw'
  },
  {
    // Strategy 5: ThingProxy (Returns Raw XML)
    // Another fallback.
    name: 'ThingProxy',
    url: (u) => `https://thingproxy.freeboard.io/fetch/${u}`,
    type: 'xml_raw'
  }
];

export const fetchNews = async (): Promise<NewsItem[]> => {
  let allNews: NewsItem[] = [];

  const parseXML = (xmlText: string, sourceName: string): NewsItem[] => {
    try {
      const parser = new DOMParser();
      const xml = parser.parseFromString(xmlText, 'text/xml');
      
      // Check for parsing errors
      const parseError = xml.querySelector('parsererror');
      if (parseError) throw new Error('XML Parsing Error');

      const items = Array.from(xml.querySelectorAll('item'));
      
      return items.map(item => {
        const title = item.querySelector('title')?.textContent || '';
        const link = item.querySelector('link')?.textContent || '';
        const pubDateStr = item.querySelector('pubDate')?.textContent || '';
        const description = item.querySelector('description')?.textContent || '';
        
        // Cleanup HTML tags
        const cleanDesc = description.replace(/<[^>]*>?/gm, '').slice(0, 250) + '...';

        if (!title || !link) return null;

        let isoDate = new Date(pubDateStr);
        if (isNaN(isoDate.getTime())) isoDate = new Date();

        return {
          id: btoa(link),
          title: title.trim(),
          link: link.trim(),
          pubDate: pubDateStr,
          source: sourceName,
          contentSnippet: cleanDesc.trim(),
          isoDate: isoDate
        };
      }).filter((i): i is NewsItem => i !== null);
    } catch (e) {
      console.warn(`XML parsing failed for ${sourceName}`, e);
      return [];
    }
  };

  const parseJSONConverted = (data: any, sourceName: string): NewsItem[] => {
    if (data.status !== 'ok' || !Array.isArray(data.items)) return [];
    
    return data.items.map((item: any) => {
      const pubDateStr = item.pubDate || item.created || '';
      let isoDate = new Date(pubDateStr);
      if (isNaN(isoDate.getTime())) isoDate = new Date();

      // Clean description (sometimes RSS2JSON leaves HTML)
      const cleanDesc = (item.description || '').replace(/<[^>]*>?/gm, '').slice(0, 250) + '...';

      return {
        id: btoa(item.link),
        title: item.title,
        link: item.link,
        pubDate: pubDateStr,
        source: sourceName,
        contentSnippet: cleanDesc,
        isoDate: isoDate
      };
    });
  };

  const fetchFeed = async (feedUrl: string, sourceName: string): Promise<NewsItem[]> => {
    const errors: any[] = [];
    // Try strategies sequentially
    for (const strategy of STRATEGIES) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout
        
        const response = await fetch(strategy.url(feedUrl), { 
            signal: controller.signal,
            headers: strategy.type === 'xml_raw' ? {} : { 'Accept': 'application/json' }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error(`Status ${response.status}`);

        let items: NewsItem[] = [];

        if (strategy.type === 'json_wrapped') {
            const data = await response.json();
            if (data.contents) {
                items = parseXML(data.contents, sourceName);
            }
        } else if (strategy.type === 'json_converted') {
            const data = await response.json();
            items = parseJSONConverted(data, sourceName);
        } else if (strategy.type === 'xml_raw') {
            const text = await response.text();
            items = parseXML(text, sourceName);
        }

        if (items.length > 0) {
            return items; // Success!
        }
        // If we got a response but failed to parse items, continue to next strategy
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.warn(`Strategy ${strategy.name} failed for ${sourceName}: ${errorMessage}`);
        errors.push({ strategy: strategy.name, error: errorMessage });
      }
    }
    
    console.error(`All strategies failed for ${sourceName}`, JSON.stringify(errors));
    return [];
  };

  const promises = RSS_FEEDS.map(feed => fetchFeed(feed.url, feed.name));
  const results = await Promise.all(promises);
  
  results.forEach(feedItems => {
    allNews = [...allNews, ...feedItems];
  });

  // Sort by date descending
  return allNews.sort((a, b) => b.isoDate.getTime() - a.isoDate.getTime());
};
