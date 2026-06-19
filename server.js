console.log('Hier komt je server voor Sprint 10.')

console.log('Gebruik uit Sprint 9 alleen de code die je mee wilt nemen.')

console.log('Zet \'m op!')
import express from 'express'

import { Liquid } from 'liquidjs';

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const engine = new Liquid()
app.engine('liquid', engine.express())
app.set('views', './views')

// district fields

const districts = ["oost", "nieuw-west", "zuidoost", "algemeen"];
app.use((req, res, next) => {
    res.locals.districts = districts;
    next();
})

// index GET route
app.get('/', async function (req, res) {
    const apiResponse = await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories?sort=-date&limit=7&filter[date][_nnull]=true')
    const apiResponseJSON = await apiResponse.json()

    res.render('index.liquid', { stories: apiResponseJSON.data })
})

app.get('/district/:district_name', async function (req, res) {
    const district = req.params.district_name
    const targetGroup = req.query.target_group || ''


    let url = 'https://fdnd-agency.directus.app/items/buurtcampuskrant_stories/?filter[district][_eq]=' + district + '&fields=*,cover.id,cover.width,cover.height'

    if (targetGroup) {
        url += '&filter[target_group][_eq]=' + targetGroup
    }

    const districtDetailResponse = await fetch(url)
    const districtDetailResponseJSON = await districtDetailResponse.json()


    const allResponse = await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories/?filter[district][_eq]=' + district + '&fields=target_group')
    const allJSON = await allResponse.json()
    const targetGroups = [...new Set(allJSON.data.map(s => s.target_group).filter(Boolean))]

    res.render('district.liquid', {
        district: districtDetailResponseJSON.data,
        districtName: district,
        targetGroups: targetGroups,
        activeGroup: targetGroup
    })
})

// articles GET route

app.get('/story/:slug', async function (req, res) {
    const slug = req.params.slug

    const storyResponse = await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories/?filter[slug][_eq]=' + slug + '&fields=*,cover.id,cover.width,cover.height')
    const storyJSON = await storyResponse.json()
    const story = storyJSON.data[0]
    const commentsResponse = await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories_comments?filter[story][_eq]=' + story.id)
    const commentsJSON = await commentsResponse.json()

    res.render('article.liquid', {
        story: story,
        comments: commentsJSON.data,
        success: req.query.success,
        error: req.query.error
    })
})

// archive GET route
app.get('/archief', async function (req, res) {
    const targetGroup = req.query.target_group || ''
    const activeYear = req.query.year || ''

    let url = 'https://fdnd-agency.directus.app/items/buurtcampuskrant_stories/?sort=-date&filter[date][_nnull]=true'

    if (targetGroup) {
        url += '&filter[target_group][_eq]=' + targetGroup
    }

    if (activeYear) {
        url += '&filter[date][_between]=' + activeYear + '-01-01,' + activeYear + '-12-31'
    }

    const apiResponse = await fetch(url)
    const apiResponseJSON = await apiResponse.json()

    // Get all unique target groups and years
    const allResponse = await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories/?fields=target_group,date')
    const allJSON = await allResponse.json()

    const targetGroups = [...new Set(allJSON.data.map(s => s.target_group).filter(Boolean))]
    const years = [...new Set(allJSON.data.map(s => s.date && s.date.slice(0, 4)).filter(Boolean))].sort().reverse()

    res.render('archief.liquid', {
        stories: apiResponseJSON.data,
        targetGroups: targetGroups,
        activeGroup: targetGroup,
        years: years,
        activeYear: activeYear
    })
})



// comments POST 

app.post('/story/:slug', async function (req, res) {
    const slug = req.params.slug

    if (req.body.comment_id) {
        await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories_comments/' + req.body.comment_id, {
            method: 'DELETE'
        })
        res.redirect(303, '/story/' + slug)
    } else {
        if (!req.body.name || !req.body.comment) {
            return res.redirect(303, '/story/' + slug + '?error=missing-fields')
        }
        const postResponse = await fetch('https://fdnd-agency.directus.app/items/buurtcampuskrant_stories_comments', {
            method: 'POST',
            body: JSON.stringify({
                name: req.body.name,
                comment: req.body.comment,
                story: req.body.story_id
            }),
            headers: {
                'Content-type': 'application/json;charset=UTF-8'
            }
        })

        if (!postResponse.ok) {
            return res.redirect(303, '/story/' + slug + '?error=post-failed')
        }

        const postJSON = await postResponse.json()
        res.redirect(303, '/story/' + slug + '?success=true#comment-' + postJSON.data.id)
    }
})

app.set('port', process.env.PORT || 8000)

app.listen(app.get('port'), function () {
    console.log(`Application started on http://localhost:${app.get('port')}`)
})

app.use((req, res, next) => {
    res.status(404).send("Pagina niet gevonden!")
})