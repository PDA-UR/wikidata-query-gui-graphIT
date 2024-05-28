## Additional Information for this Fork
Develop with a local wikibase docker setup:
- set up a default one using this [guide](https://www.mediawiki.org/wiki/Wikibase/Docker) (should be fine with just the minimal install)
- set up a custom GraphIT configuration using the private repo 
- insert (test) data

### In this Repo
- for development use:
  - `npm start` (uses http-server)
  - or smth like the vs-code extension "Live Server" (for automatic reload)
  - (and start your docker container, of course)
- create a `custom-config.js` file and override the necessary settings, with something like this:
```json
{
    "api": {
      "sparql": {
        "uri": "http://localhost:8834/proxy/wdqs/bigdata/namespace/wdq/sparql"
      },
      "wikibase": {
        "uri": "http://localhost:80/w/api.php"
      }
    }
}
```
- NOTE: can cause issues with CORS. So you can try adding `$wgCrossSiteAJAXdomains = ['*', "optional:your-local-url"];` to the `LocalSettings.php` of your local wikibase docker setup (don't push this change!)
- NOTE: with `npm start` it can happen that changes to the code don't show up when running the server. Deleting your cache for `localhost` might help.

### Deployment
- handled in the private GraphIT docker repo
- but basically:
  1. create a separate folder for the gui
    1. add all files, as seen in the official [build-folder](https://github.com/wmde/wikibase-release-pipeline/tree/main/build/WDQS-frontend) of the frontend (you don't need the README)
    2. customize the Dockerfile of the wikibase-release-pipeline
       1. use the same images they use (see the [variables.env](https://github.com/wmde/wikibase-release-pipeline/blob/main/variables.env))
       2. git clone the fork instead of the official repo (see the [Dockerfile](https://github.com/wmde/wikibase-release-pipeline/blob/main/build/WDQS-frontend/Dockerfile))
       3. don't checkout that commit (after the git clone)
   2. inject that image into the docker-compose.yaml, by setting the build option to the gui folder instead of using the pre build image
   3. adjust as necessary
- for further reference, see the [wikibase-release-pipeline](https://github.com/wmde/wikibase-release-pipeline/tree/main)
- for the future:
  - handle deployment here
  - build docker image (see above) and push to registry
  - then simply pull in the docker-compose.yaml of the GraphIT docker instance

### Changes and Usage
Added support for **colors** for multiple columns
- `?node_w_rgb1 ?rgb1 ?node_w_rgb2 ?rgb2`
- `BIND("F68C13" as ?rgb1)` in Query body

Added support for **shapes** for multiple columns
- works like `?rgb`
- uses visjs shapes: ellipse, circle, database, box, text, circularImage, diamond, dot, star, triangle
- `BIND("star" as ?shape1)`

Added support for setting `rgb` and `shape` via comment parameters
- works similar to `#defaultview:Graph`
- use outside (or before) the graph-query
- syntax: `#set:<var_name>;rgb=<hex_code>;shape=<visjs_shape>`
  - example: `#set:item;rgb=F68C13;shape=star` for variable `?item`
  - evtl: `#?item:rgb=F68C13;shape=star` for variable `?item` (not implemented)

  
[visjs](https://visjs.org/)

## Custom Charts

### Swarm Scatter Chart
A chart that takes the stacked points of a scatter chart and rearanges them in a circular pattern, to show the otherwise hidden points.
- set as default view using: `#defaultView:SwarmScatterChart` in the SPARQL query or select in the dropdown.
- NOTE: load the file in both index.html and embed.html using the `<script>`-tag




<small>see the official information down below</small>

---

# Wikibase Query Service GUI

This repository contains the GUI for the [Wikidata Query Service](https://query.wikidata.org/).

Please see more details about the service in the [User Manual](https://www.mediawiki.org/wiki/Special:MyLanguage/Wikidata_Query_Service/User_Manual).

## Download & setup

Clone git repo, go into created folder and then pull all dependencies via npm package manager.

```bash
$ git clone https://gerrit.wikimedia.org/r/wikidata/query/gui
$ cd gui
$ npm install
```

Alternatively, use `npm install`.

```bash
npm install wikidata-query-gui
```

## Configuration
Per default the Wikibase Query Service GUI is configured to be used as a local development test instance. It can be customized by creating a `custom-config.json` in the repository's root dir. This file can be used to override any of the default settings obtained from `default-config.json`.

## Run tests

Run JSHint, JSCS and QUnit tests.

```bash
$ npm test
```

## Debug
Start a test server for local debugging. Do not use it in production.

```bash
$ npm start
```

## Build
Create a build with bundled and minified files.

```bash
$ npm run build
```


## Deploy
To deploy the GUI, [trigger a new build of the deploy repo on Jenkins](https://integration.wikimedia.org/ci/job/wikidata-query-gui-build/).

![Screenshot of the Jenkins dashboard for the build repo. Highlighted are the build buttons in the sidebar with a "1" and the "Build" button in the main part with a "2"](docs/images/triggerDeployBuild.png)

This creates a new open change in the deploy repository: https://gerrit.wikimedia.org/r/q/project:wikidata/query/gui-deploy+status:open
That change will be based on the [latest commit in the master branch](https://gerrit.wikimedia.org/r/plugins/gitiles/wikidata/query/gui/+log/refs/heads/master), and thus it will include all previous commits.
Optionally, you can edit the commit message in the Gerrit UI to include the `Bug: Txxxxx` line, to emphasize to which task the change belongs.

You can clone that repository and check out the change locally to test and verify it.

As that repository does not have any CI, you need to manually merge the change.
That means, giving +2 to both the Code Review as well as the Verified label, and then clicking the "Submit" button.

The site will be deployed with the next puppet run, which should happen after at most 30 minutes.

See also: https://wikitech.wikimedia.org/wiki/Wikidata_Query_Service#GUI_deployment_general_notes

## Components
### Editor
A [CodeMirror](https://codemirror.net/) based SPARQL editor with code completion (ctrl+space) and tooltips (hover).
```
var editor = new wikibase.queryService.ui.editor.Editor();
editor.fromTextArea( $( '.editor' )[0] );
```
See `examples/editor.html`.

### Example dialog

A dialog that allows browsing of SPARQL examples.
```
new wikibase.queryService.ui.dialog.QueryExampleDialog(  $element, querySamplesApi, callback, previewUrl );
```
See `examples/dialog.html`.

### SPARQL

```
var api = new wikibase.queryService.api.Sparql();
api.query( query ).done( function() {
	var json = JSON.parse( api.getResultAsJson() );

} );
```
See `examples/sparql.html`.
[JSFiddle.net](https://jsfiddle.net/jonaskress/qpuynfz8/)


### Result Views
Views that allow rendering SPARQL results ([see documentation](https://www.wikidata.org/wiki/Special:MyLanguage/Wikidata:SPARQL_query_service/Wikidata_Query_Help/Result_Views)).

```
var api = new wikibase.queryService.api.Sparql();
api.query( query ).done(function() {
	var result = new wikibase.queryService.ui.resultBrowser.CoordinateResultBrowser();
	result.setResult( api.getResultRawData() );
	result.draw( element );
} );
```
See `examples/result.html`.
[JSFiddle.net](https://jsfiddle.net/jonaskress/9dhv0yLp/)

### Release Notes and npm package

Unfortunately there are no releases and the provided code and interfaces are not considered to be stable.
Also the dist/ folder contains a build that may not reflect the current code on master branch.
