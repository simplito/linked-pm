var gulp = require('gulp'),
    watch = require('gulp-watch'),
    bower = require('gulp-bower'),
    concat = require('gulp-concat'),
    cleanCSS = require('gulp-clean-css'),
    clean = require('gulp-clean'),
    copy = require('gulp-copy'),
    argv = require('yargs').argv,
    gulpif = require('gulp-if'),
    uglify = require('gulp-uglify'),
    connect = require('gulp-connect'),
    htmlreplace = require('gulp-html-replace'),
    browserify = require('browserify'),
    collapse = require('bundle-collapser/plugin'),
    source = require('vinyl-source-stream'),
    buffer = require('vinyl-buffer');

var config = {
    bowerDir: './bower_components',
    minify: true
}

if(argv.debug) {
    config.minify = false;
}

gulp.task('bower', function() {
    return bower()
        .pipe(gulp.dest(config.bowerDir))
});

gulp.task('clean', function(){
    return gulp.src([
        'dist'
    ], {read: false})
        .pipe(clean({force: true}));
});

gulp.task('favicon', function(){
    return gulp.src('src/assets/favicon.ico')
        .pipe(copy('dist', {prefix: 2}));
})

gulp.task('assets', ['bower', 'favicon'], function(){
    return gulp.src('src/assets/**')
        .pipe(copy('dist/assets', {prefix: 2}));
});

gulp.task('dist', ['assets', 'html']);

gulp.task('default', ['dist']);


gulp.task('watch-js', function(){
    watch("src/js/*.js", function() {
        gulp.start("html");
    });
});

gulp.task('watch-css', function(){
    watch("src/css/*.css", function() {
        gulp.start("html");
    });
});

gulp.task('watch-html', function(){
    watch("src/html/*.html", function() {
        gulp.start("html");
    });
});

gulp.task('watch', ['watch-js', 'watch-css', 'watch-html']);

gulp.task('webserver', ['default', 'watch'],  function() {
    connect.server({
        livereload: true,
        root: ['.', 'dist']
    });
});

gulp.task('html', ['bower'], function(){

    var b = browserify({
        entries: 'src/js/index.js',
        debug : !config.minify,
        builtins: {}
    }).plugin(collapse);

    return gulp.src('src/html/index.html')
    .pipe(htmlreplace({
        'css': {
            src: gulp.src([
                    'bower_components/normalize.css/normalize.css',
                    'bower_components/milligram/dist/milligram.css',
                    'node_modules/alertify.js/src/css/alertify.css',
                    'src/css/index.css'
                ],  {base: 'bower_components/'})
                .pipe(concat('index.css'))
                .pipe(gulpif(config.minify, cleanCSS({debug: true, compatibility: 'ie8'}))),
            tpl: "<style>%s</style>"
        },
        'js': {
            src: b.bundle()
                .pipe(source('src/js/index.js'))
                .pipe(buffer())
                .pipe(gulpif(config.minify, uglify())),
            tpl: "<script>%s</script>"
        }
    }))
    .pipe(gulp.dest('dist/'));
});
