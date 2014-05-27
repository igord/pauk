module.exports = function(grunt) {
    grunt.initConfig({
	jshint: {
	    files: ['gruntfile.js', 'index.js', 'test/**/*.js'],
	},
	watch: {
	    files: ['<%= jshint.files %>'],
	    tasks: ['jshint', 'simplemocha']
	},
	simplemocha: {
	    options: {
		reporter: 'spec'
	    },
	    src: [
		'test/pauk.spec.js'
	    ]
	}
	
    });

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-simple-mocha');

    grunt.registerTask('default', ['jshint', 'simplemocha']);
};

