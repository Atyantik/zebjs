# ZebJS

Contrary to the title ZebJS, it is not a standalone JavaScript file, it is a framework build on BackboneJS that provides an entire solution to make robust single/multi page Front-End applications.

Currently the project is handled by [Atyantik Technologies]

>ZebJS is an RAD framework build on top of BackboneJS. Inspired with the goodness 
>of PHP's Zend Framework 2, combination of some of the concepts of ZEnd and >BackboneJS makes the "**ZEB**" 

What did we keep in mind while making ZebJS
  - Ghost View problem with BackboneJS
  - Adding Subview Support to Views
  - Added Controllers, No framework is complete without controllers
  - Taking care of routes that are build with search queries.
  - Runing application from a CDN
  - Page/Module wise javascript compression
  - On Demand JavaScript bundle loading
  - Autoloading of files by specifying the path
  - SEO optimizable with the help of [PhantomJS]

*NOTE: Some of the above mention functionalities may be in pending state and may be a part of a certail milestone. Also we are still not supporting dual data binding with this framework

## Requirements
**NodeJS**: For optimization of the application including minification, page/module wise bundeling
**BackboneJS** and **RequireJS**: Front-end application loading

If you only want to use the goodness of Zeb Architecture, you can ignore the optimizations from NodeJS and thus can remove from dependency list. Still it is hightly recommended to use compressed and optimized code for production environment. 
 - [NodeJS]
    -   [Glob]
    -   [Q]
    -   [Underscore]
    -   [Wrench]
    -   [Uglify-JS]
 - [BackboneJS]
    -   [JQuery]/[Zepto]
    -   [UnderscoreJS]/[Lodash]
 - [RequireJS]
    - [Text] Plugin

[Atyantik Technologies]: http://www.atyantik.com
[PhantomJS]: http://phantomjs.org/
[NodeJS]: https://nodejs.org/
[Glob]: https://www.npmjs.com/package/glob
[Q]: https://www.npmjs.com/package/q
[Underscore]: https://www.npmjs.com/package/underscore
[Wrench]: https://www.npmjs.com/package/wrench
[Uglify-JS]: https://www.npmjs.com/package/uglify-js
[BackboneJS]: http://backbonejs.org/
[jQuery]: http://jquery.com/
[Zepto]: http://zeptojs.com/
[UnderscoreJS]: http://underscorejs.org/
[Lodash]: https://lodash.com/
[RequireJS]: http://requirejs.org/
[Text]: https://github.com/requirejs/text