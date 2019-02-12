# Stremio Add-on for Torrent Freak Top 10 Movies

Adds a catalog to Stremio that shows Torrent Freak's Top 10 Weekly Movies.

# Usage

Install it from Stremio's add-on catalog, in the community add-ons section.

# Testing

This add-on uses a serverless implementation, you can test it with `now.sh` ([link](https://zeit.co/))

```
git clone https://github.com/BoredLama/stremio-top-10-torrentfreak.git
cd stremio-top-10-torrentfreak
npm install -g now
now
```

This will reply with a link, add `/manifest.json` to the end of that link and use it in Stremio.

![addlink](https://user-images.githubusercontent.com/1777923/43146711-65a33ccc-8f6a-11e8-978e-4c69640e63e3.png)

