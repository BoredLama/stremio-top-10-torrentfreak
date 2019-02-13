const Parser = require('rss-parser')
const parser = new Parser()

const needle = require('needle')
const cheerio = require('cheerio')
const async = require('async')

let top10 = []

let oldImdbIds = []

const getMeta = (imdbId, cb) => {
    const found = top10.some(meta => {
      if (meta && meta.imdb_id && meta.imdb_id == imdbId) {
        cb(meta)
        return true
      }
    })
    if (!found)
      needle.get('https://v3-cinemeta.strem.io/meta/movie/' + imdbId + '.json', (err, resp, body) => {
        cb(body && body.meta ? body.meta : false)
      })
}

let updateMetasTimer

function updateMetas() {

  if (updateMetasTimer) {
    clearTimeout(updateMetasTimer)
    updateMetasTimer = false
  }

  const metas = []

  const metaQueue = async.queue((imdbId, cb) => {
    getMeta(imdbId, (metaObj) => {
      if (metaObj)
        metas.push(metaObj)
      cb()
    })
  }, 1)

  metaQueue.drain = () => {
    top10 = metas

    if (top10.length < oldImdbIds.length)
      updateMetasTimer = setTimeout(updateMetas, 3600000) // try again in 1 hour
  }

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

  if (JSON.stringify(oldImdbIds) != JSON.stringify(imdbIds)) {
    oldImdbIds = imdbIds
    updateMetas()
  }
}

populate()

setInterval(populate, 172800000) // populate every 2 days

const addonSDK = require('stremio-addon-sdk')

const addon = new addonSDK({
    id: 'org.tftop10',
    version: '0.0.3',
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

addon.runHTTPWithOptions({ port: process.env.PORT || 7550 })

addon.publishToCentral("https://top-10-torrentfreak.herokuapp.com/manifest.json")
