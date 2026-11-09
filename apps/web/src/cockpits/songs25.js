// THE SONGS (9 Nov, later; Andrew: "just wire the whole songs into the app for the time being ... Let's just shuffle between the songs and randomly pick one every
// time and not have them triggered by any events"). After a home run the next song comes off a shuffled bag: every song once before any song twice, never the same
// song twice running. The songs are his picks, whole, as chiptune, in the git-ignored public/songs_private.json (copyrighted: the private friends' site only),
// built by Documents/NukeNavigator/songbook. A song plays until you move on (the director stops it on the next swing, mode or panel).
// (The situation slots of earlier on 9 Nov, a song per kind of home run, are gone; the slot list stays on the songs page for later.)
let bag = [], last = null
export function nextSong(ids) {
  if (!ids.length) return null
  bag = bag.filter((id) => ids.includes(id))
  if (!bag.length) {
    bag = ids.slice()
    for (let i = bag.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [bag[i], bag[j]] = [bag[j], bag[i]] }
    if (bag.length > 1 && bag[bag.length - 1] === last) bag.unshift(bag.pop())
  }
  last = bag.pop()
  return last
}
