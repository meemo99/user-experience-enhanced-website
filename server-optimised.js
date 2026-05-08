
import express from 'express'

import { Liquid } from 'liquidjs';

const app = express()
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))

const engine = new Liquid()
app.engine('liquid', engine.express())
app.set('views', './views')

const baseURL = 'https://fdnd-agency.directus.app/items/buurtcampuskrant_stories/'

const districts = ["oost", "nieuw-west", "zuidoost", "algemeen"];
app.use((req, res, next) => {
    res.locals.districts = districts;
    next();
})

app.get('/', async function (req, res) {
    const params = new URLSearchParams()
    params.set('limit', 4)
    params.set('sort', '-data')

    const apiResponse = await fetch(`${baseURL}?${params.toString()}`)
    const apiResponseJSON = await apiResponse.json()

    res.render('index.liquid', { stories: apiResponseJSON.data })
})

app.get('/district/:district_name', async function (req, res) {
    const district = req.params.district_name
    const districtDetailResponse = await fetch(`${baseURL}?${params.toString()}`)

    const districtDetailResponseJSON = await districtDetailResponse.json()
    res.render('district.liquid', { district: districtDetailResponseJSON.data, districtName: district })
})

app.get('/story/:slug', async function (req, res) {
    const slug = req.params.slug

    const storyResponse = await fetch(`${baseURL}?${params.toString()}`)
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

app.get('/archief', async function (req, res) {
    const apiResponse = await fetch(`${baseURL}?${params.toString()}`)
    const apiResponseJSON = await apiResponse.json()
    res.render('archief.liquid', { stories: apiResponseJSON.data })
})

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