const Parser = require('rss-parser')
const parser = new Parser()

const needle = require('needle')
const cheerio = require('cheerio')
const async = require('async')

let top10 = []

let oldImdbIds = []

const getMeta = (imdbId, cb) => {
    needle.get('https://v3-cinemeta.strem.io/meta/movie/' + imdbId + '.json', (err, resp, body) => {
        cb(body && body.meta ? body.meta : false)
    })
}

function updateMetas() {
  const metas = []

  const metaQueue = async.queue((imdbId, cb) => {
    getMeta(imdbId, (metaObj) => {
      if (metaObj)
        metas.push(metaObj)
      cb()
    })
  }, 1)

  metaQueue.drain = () => { top10 = metas }

  oldImdbIds.forEach(imdbId => { metaQueue.push(imdbId) })
}

const populate = async () => {
 
  let feed = await parser.parseURL('https://torrentfreak.com/category/dvdrip/feed/')
 
  const imdbIds = []

  feed.items.some(item => {
    if (item.title.startsWith('Top 10 Most Pirated Movies of The Week')) {
      if (item['content:encoded']) {
      	const $ = cheerio.load(item['content:encoded'])
        $('a').each((ij, el) => {
          const href = $(el).attr('href');
          if (href.startsWith('https://www.imdb.com/title/')) {
            const imdbId = href.replace('https://www.imdb.com/title/', '').replace('/','')
            if (imdbIds.indexOf(imdbId) == -1)
              imdbIds.push(imdbId)
          }
        })
        return true
      }
    }
  })

  if (!imdbIds.length || JSON.stringify(imdbIds) == JSON.stringify(oldImdbIds)) {
  	return
  }

  oldImdbIds = imdbIds

  updateMetas()

}

populate()

setInterval(populate, 172800000) // populate every 2 days

// check cinemeta for new items every 13 hours
setInterval(() => {
  if (top10.length < oldImdbIds.length)
    updateMetas()
}, 46800000)

const addonSDK = require('stremio-addon-sdk')

const addon = new addonSDK({
    id: 'org.tftop10',
    version: '0.0.2',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d1/TorrentFreak_logo.svg/982px-TorrentFreak_logo.svg.png',
    name: 'TorrentFreak Top 10 Movies',
    description: 'Add-on to show a Catalog for TorrenFreak\'s Weekly Top 10 Movies',
    resources: ['catalog'],
    types: ['movie'],
    idPrefixes: ['tt'],
    catalogs: [
    	{
    		type: 'movie',
    		id: 'tktop10movies',
    		name: 'Top 10 Most Pirated by TorrentFreak'
    	}
    ]
})

addon.defineCatalogHandler((args, cb) => {
    cb(null, args.type === 'movie' && args.id === 'tktop10movies' ? { metas: top10 } : null)
})

module.exports = addon.getServerlessHandler()
