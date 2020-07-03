var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var through = require('through2');

module.exports = function (args) {

	var options = {
		/*
		 * 自定义的文件名和hash值拼接函数，返回最终的文件名
		 * 例如： xxx.png和as65f1a6s1f65as165fa
		 * 默认会返回 xxx.png?_=as65f1a6s1f65as165fa
		 * 建议在pipe里重新定义该函数
		 */
		customHash: function(fileName, hash){
			return fileName + '?_=' + hash;
		},
		/**
		 * 需要进行处理的文件类型，默认如下
		 */
		targetFileType: ['png', 'jpg', 'jpeg', 'gif', 'svg']
	};

	for(var a in args){
		options[a] = args[a];
	}

	/*
	 * 匹配所有带有指定文件后缀名的的url(xxx)
	 */
	var targetFileType = options.targetFileType.join('|'),
		reg = new RegExp(/(url\(['"]?)([^\)\"\']+?\.(?:GULPCSSURLCUSTOMHASH))([^\)\"\']*?)(['"]?\))/.source.replace('GULPCSSURLCUSTOMHASH', targetFileType), 'igm');

	return through.obj(function (file, enc, callback) {
		var filepath = file.path;
		var cssdir = path.dirname(file.path);
    
		if (file.isNull()) {
			this.push(file);
			return callback();
		}
		if (file.isStream()) {
			console.error('Streams are not supported!');
			return callback();
		}

		var contents = file.contents.toString().replace(reg, function (content, left, imgurl, query, right) {
			/*
			 * 匹配所有的url(xxx)并分成五个部分，假设为url("xxx/xxx/img.png?123")，则得到的参数为：
			 * content: url("xxx/xxx/img.png")
			 * left:    url("
			 * imgurl:  xxx/xxx/img.png
			 * query:   ?123
			 * right:   ")
			 */
			var hashedImgUrl = customHashedUrl(cssdir, imgurl, filepath, options.customHash);
			return left + hashedImgUrl + right;
		})

		file.contents = new Buffer(contents);

		this.push(file);
		return callback();
	})
}

function customHashedUrl(cssdir, imgurl, filepath, customHash) {
	try{
		var imgFilePath = path.join(cssdir, imgurl),
			imgFileName = path.basename(imgFilePath),
			file = fs.readFileSync(imgFilePath),
			hash = crypto.createHash('md5').update(file).digest('hex');
		return imgurl.replace(imgFileName, customHash(imgFileName, hash, imgFilePath));
	}catch(e){
		console.warn(e);
		console.log('Please try again -_- !')
	}
}
