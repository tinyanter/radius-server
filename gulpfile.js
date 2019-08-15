var gulp = require('gulp');
var ts = require('gulp-typescript');
var nodemon = require('gulp-nodemon')
var changed = require('gulp-changed')
var cached = require('gulp-cached')
var sourcemaps = require('gulp-sourcemaps');
var del = require('del');
var tsProject = ts.createProject('tsconfig.json', { noImplicitAny: true });
gulp.task('default', ['copy', 'copy-dictionaries', 'compile', 'watch', 'start'], function () {
    console.log('项目准备完成')
});
gulp.task('debug', ['copy', 'compile', 'watch'], function () {
    console.log('项目准备完成请手工启动项目')
})

gulp.task('build', ['copy', 'copy-dictionaries', 'compile'], function () {
    console.log('项目build完成')
})


gulp.task('deleteOutput', function (cb) {
    return del([
        'output/**/*'
    ], cb);
});
gulp.task('compile', function () {
    console.log('初始化编译')
    return gulp.src("./src/**/*.ts")
        .pipe(sourcemaps.init())
        .pipe(cached('sass-task'))  // 取个名字
        .pipe(tsProject())
        .pipe(sourcemaps.write('../maps'))
        .pipe(gulp.dest('./output'));
});

gulp.task("copy", ['deleteOutput'], function () {
    return gulp.src('./src/config/**/*', { base: './src' })
        .pipe(gulp.dest('./output/'))
});

gulp.task("copy-dictionaries", ['deleteOutput'], function () {
    return gulp.src('./lib/*', { base: './lib' })
        .pipe(gulp.dest('./node_modules/radius/dictionaries/'))
});

gulp.task('compile_chanage', function () {
    console.log('文件发生变化，重新编译')
    gulp.src("./src/**/*.ts")
        .pipe(sourcemaps.init())
        .pipe(cached('sass-task'))  // 取个名字
        .pipe(tsProject())
        .pipe(sourcemaps.write('../maps'))
        .pipe(gulp.dest('./output'));
});


gulp.task('watch', ['compile'], function () {
    var watcher = gulp.watch("./src/**/*.ts", ['compile_chanage']);
    watcher.on('change', function (event) {
        console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
    })
    return watcher
});

gulp.task('start', ['compile'], function () {
    nodemon({
        script: 'output/main.js',
        env: { 'NODE_ENV': 'development' }
    })

})