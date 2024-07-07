import { createWriteStream } from 'fs';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';

// Lista URL-i do umieszczenia w mapie strony
const links = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/about', changefreq: 'monthly', priority: 0.8 },
    { url: '/photos', changefreq: 'monthly', priority: 0.5 },
    { url: '/projects', changefreq: 'monthly', priority: 0.5 },
];

// Stwórz sitemapę
const stream = new SitemapStream({ hostname: 'https://www.hexthecoder.pl' });
const sitemap = streamToPromise(Readable.from(links).pipe(stream)).then(data =>
    data.toString()
);

// Zapisz sitemap.xml do pliku
sitemap.then(data => {
    const writeStream = createWriteStream('public/sitemap.xml');
    writeStream.write(data);
    writeStream.end();
    console.log('sitemap.xml wygenerowana');
});
