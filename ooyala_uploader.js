// https://github.com/ArabellaTech/backlot-ingestion-library
(function() {
  var CHUNK_SIZE, ChunkUploader, FileSplitter, MovieUploader, RETRY_INTERVAL,
    __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
    __indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

  CHUNK_SIZE = 1024 * 1024 * 5;

  RETRY_INTERVAL = 1000;

  window.OoyalaUploader = (function() {
    function OoyalaUploader(options) {
      var _ref, _ref1;
      if (options == null) {
        options = {};
      }
      this.uploadFileUsingFlash = __bind(this.uploadFileUsingFlash, this);
      this.uploadError = __bind(this.uploadError, this);
      this.uploadComplete = __bind(this.uploadComplete, this);
      this.uploadProgress = __bind(this.uploadProgress, this);
      this.embedCodeReady = __bind(this.embedCodeReady, this);
      this.uploadFile = __bind(this.uploadFile, this);
      this.off = __bind(this.off, this);
      this.on = __bind(this.on, this);
      this.chunkProgress = {};
      this.eventListeners = {};
      this.initializeListeners(options);
      this.uploaderType = (_ref = options != null ? options.uploaderType : void 0) != null ? _ref : "HTML5";
      if ((_ref1 = this.uploaderType) !== "Flash" && _ref1 !== "HTML5") {
        throw "uploaderType must be either HTML5 or Flash";
      }
      if (this.uploaderType === "Flash") {
        if ((options != null ? options.swfUploader : void 0) == null) {
          throw new Error("a reference to the SWFUpload object is required for Flash uploads");
        }
        this.swfUploader = options.swfUploader;
      }
    }

    OoyalaUploader.prototype.initializeListeners = function(options) {
      var eventType, listeners, _i, _len, _ref, _results;
      _ref = ["embedCodeReady", "uploadProgress", "uploadComplete", "uploadError"];
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        eventType = _ref[_i];
        if (options[eventType] != null) {
          listeners = options[eventType] instanceof Array ? options[eventType] : [options[eventType]];
        } else {
          listeners = [];
        }
        _results.push(this.eventListeners[eventType] = listeners);
      }
      return _results;
    };

    OoyalaUploader.prototype.on = function(eventType, eventListener) {
      if (this.eventListeners[eventType] == null) {
        throw new Error("invalid eventType");
      }
      return this.eventListeners[eventType].push(eventListener);
    };

    OoyalaUploader.prototype.off = function(eventType, eventListener) {
      var index, listeners, _results;
      if (eventListener == null) {
        eventListener = null;
      }
      if (eventListener == null) {
        this.eventListeners[eventType] = [];
        return;
      }
      listeners = this.eventListeners[eventType];
      _results = [];
      while ((index = listeners.indexOf(eventListener)) >= 0) {
        _results.push(listeners.splice(index, 1));
      }
      return _results;
    };

    OoyalaUploader.prototype.uploadFile = function(file, options) {
      var movieUploader;
      if (options == null) {
        options = {};
      }
      if (!this.html5UploadSupported) {
        return false;
      }
      movieUploader = new MovieUploader({
        embedCodeReady: this.embedCodeReady,
        uploadProgress: this.uploadProgress,
        uploadComplete: this.uploadComplete,
        uploadError: this.uploadError,
        uploaderType: this.uploaderType
      });
      movieUploader.uploadFile(file, options);
      return movieUploader;
    };

    OoyalaUploader.prototype.embedCodeReady = function(assetID) {
      var eventListener, _i, _len, _ref, _ref1, _results;
      _ref1 = (_ref = this.eventListeners["embedCodeReady"]) != null ? _ref : [];
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        eventListener = _ref1[_i];
        _results.push(eventListener(assetID));
      }
      return _results;
    };

    OoyalaUploader.prototype.uploadProgress = function(assetID, progressPercent) {
      var eventListener, previousProgress, _i, _len, _ref, _ref1, _results;
      previousProgress = this.chunkProgress[assetID];
      if (progressPercent === previousProgress) {
        return;
      }
      this.chunkProgress[assetID] = progressPercent;
      _ref1 = (_ref = this.eventListeners["uploadProgress"]) != null ? _ref : [];
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        eventListener = _ref1[_i];
        _results.push(eventListener(assetID, progressPercent));
      }
      return _results;
    };

    OoyalaUploader.prototype.uploadComplete = function(assetID) {
      var eventListener, _i, _len, _ref, _ref1, _results;
      delete this.chunkProgress[assetID];
      _ref1 = (_ref = this.eventListeners["uploadComplete"]) != null ? _ref : [];
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        eventListener = _ref1[_i];
        _results.push(eventListener(assetID));
      }
      return _results;
    };

    OoyalaUploader.prototype.uploadError = function(assetID, type, fileName, statusCode, message) {
      var eventListener, _i, _len, _ref, _ref1, _results;
      _ref1 = (_ref = this.eventListeners["uploadError"]) != null ? _ref : [];
      _results = [];
      for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
        eventListener = _ref1[_i];
        _results.push(eventListener(assetID, type, fileName, statusCode, message));
      }
      return _results;
    };

    OoyalaUploader.prototype.uploadFileUsingFlash = function(options) {
      var movieUploader;
      if (options == null) {
        options = {};
      }
      if (this.uploaderType !== "Flash") {
        throw new Error("uploaderType must be Flash to call this method");
      }
      movieUploader = new MovieUploader({
        embedCodeReady: this.embedCodeReady,
        uploadProgress: this.uploadProgress,
        uploadComplete: this.uploadComplete,
        uploadError: this.uploadError,
        uploaderType: this.uploaderType,
        swfUploader: this.swfUploader
      });
      movieUploader.uploadFileUsingFlash(options);
      return movieUploader;
    };

    OoyalaUploader.prototype.html5UploadSupported = typeof FileReader !== "undefined" && FileReader !== null;

    return OoyalaUploader;

  })();

  MovieUploader = (function() {
    function MovieUploader(options) {
      this.onError = __bind(this.onError, this);
      this.onAssetUploadComplete = __bind(this.onAssetUploadComplete, this);
      this.onChunkComplete = __bind(this.onChunkComplete, this);
      this.onChunkProgress = __bind(this.onChunkProgress, this);
      this.onFlashUploadError = __bind(this.onFlashUploadError, this);
      this.onFlashUploadComplete = __bind(this.onFlashUploadComplete, this);
      this.onFlashUploadProgress = __bind(this.onFlashUploadProgress, this);
      this.startFlashUpload = __bind(this.startFlashUpload, this);
      this.startHTML5Upload = __bind(this.startHTML5Upload, this);
      this.onUploadUrlsReceived = __bind(this.onUploadUrlsReceived, this);
      this.onAssetCreated = __bind(this.onAssetCreated, this);
      this.createAsset = __bind(this.createAsset, this);
      this.setAssetMetadata = __bind(this.setAssetMetadata, this);
      this.uploadFileUsingFlash = __bind(this.uploadFileUsingFlash, this);
      this.uploadFile = __bind(this.uploadFile, this);
      var _ref, _ref1, _ref2, _ref3, _ref4;
      this.embedCodeReadyCallback = (_ref = options != null ? options.embedCodeReady : void 0) != null ? _ref : function() {};
      this.uploadProgressCallback = (_ref1 = options != null ? options.uploadProgress : void 0) != null ? _ref1 : function() {};
      this.uploadCompleteCallback = (_ref2 = options != null ? options.uploadComplete : void 0) != null ? _ref2 : function() {};
      this.uploadErrorCallback = (_ref3 = options != null ? options.uploadError : void 0) != null ? _ref3 : function() {};
      this.uploaderType = (_ref4 = options != null ? options.uploaderType : void 0) != null ? _ref4 : "HTML5";
      if (this.uploaderType === "Flash") {
        this.swfUploader = options.swfUploader;
      }
      this.chunkUploaders = {};
      this.completedChunkIndexes = [];
      this.completedChunks = 0;
      this.totalChunks;
    }

    /*
    Placeholders in the urls are replaced dynamically when the http request is built
    assetID   -   is replaced with the actual id of the asset (embed code)
    paths      -   is replaced with a comma separated list of labels, the ones that will be created
    */


    MovieUploader.prototype.uploadFile = function(file, options) {
      var _base;
      this.file = file;
      console.log("Uploading file using browser: " + navigator.userAgent);
      this.setAssetMetadata(options);
      if ((_base = this.assetMetadata).assetName == null) {
        _base.assetName = this.file.name;
      }
      this.assetMetadata.fileSize = this.file.size;
      this.assetMetadata.fileName = this.file.name;
      return this.createAsset();
    };

    MovieUploader.prototype.uploadFileUsingFlash = function(options) {
      var file, _base;
      file = this.swfUploader.getFile(0);
      if (file == null) {
        throw new Error("Flash Upload: No Files Queued");
      }
      this.setAssetMetadata(options);
      if ((_base = this.assetMetadata).assetName == null) {
        _base.assetName = file.name;
      }
      this.assetMetadata.fileSize = file.size;
      this.assetMetadata.fileName = file.name;
      this.swfUploader.settings["upload_success_handler"] = this.onFlashUploadComplete;
      this.swfUploader.settings["upload_progress_handler"] = this.onFlashUploadProgress;
      this.swfUploader.settings["upload_error_handler"] = this.onFlashUploadError;
      return this.createAsset();
    };

    MovieUploader.prototype.setAssetMetadata = function(options) {
      var _ref, _ref1, _ref2, _ref3, _ref4, _ref5, _ref6, _ref7, _ref8;
      return this.assetMetadata = {
        assetCreationUrl: (_ref = options.assetCreationUrl) != null ? _ref : "/v2/assets",
        assetUploadingUrl: (_ref1 = options.assetUploadingUrl) != null ? _ref1 : "/v2/assets/assetID/uploading_urls",
        assetStatusUpdateUrl: (_ref2 = options.assetStatusUpdateUrl) != null ? _ref2 : "/v2/assets/assetID/upload_status",
        assetName: options.name,
        assetDescription: (_ref3 = options.description) != null ? _ref3 : "",
        assetType: (_ref4 = options.assetType) != null ? _ref4 : "video",
        createdAt: new Date().getTime(),
        assetLabels: (_ref5 = options.labels) != null ? _ref5 : [],
        postProcessingStatus: (_ref6 = options.postProcessingStatus) != null ? _ref6 : "live",
        labelCreationUrl: (_ref7 = options.labelCreationUrl) != null ? _ref7 : "/v2/labels/by_full_path/paths",
        labelAssignmentUrl: (_ref8 = options.labelAssignmentUrl) != null ? _ref8 : "/v2/assets/assetID/labels",
        assetID: ""
      };
    };

    MovieUploader.prototype.createAsset = function() {
      var postData,
        _this = this;
      postData = {
        name: this.assetMetadata.assetName,
        description: this.assetMetadata.assetDescription,
        file_name: this.assetMetadata.fileName,
        file_size: this.assetMetadata.fileSize,
        asset_type: this.assetMetadata.assetType,
        post_processing_status: this.assetMetadata.postProcessingStatus
      };
      if (this.uploaderType === "HTML5") {
        postData.chunk_size = CHUNK_SIZE;
      }
      return jQuery.ajax({
        url: this.assetMetadata.assetCreationUrl,
        type: "POST",
        data: postData,
        success: function(response) {
          return _this.onAssetCreated(response);
        },
        error: function(response) {
          return _this.onError(response, "Asset creation error");
        }
      });
    };

    MovieUploader.prototype.onAssetCreated = function(assetCreationResponse) {
      var parsedResponse;
      parsedResponse = assetCreationResponse;//JSON.parse(assetCreationResponse);
      this.assetMetadata.assetID = parsedResponse.embed_code;
      /*
      Note: It could take some time for the asset to be copied. Send the upload ready callback
      immediately so that the user has some UI indication that upload has started
      */

      this.embedCodeReadyCallback(this.assetMetadata.assetID);
      this.assetMetadata.assetLabels.filter(function(arrayElement) {
        return arrayElement;
      });
      if (this.assetMetadata.assetLabels.length !== 0) {
        this.createLabels();
      }
      return this.getUploadingUrls();
    };

    MovieUploader.prototype.createLabels = function() {
      var listOfLabels,
        _this = this;
      listOfLabels = this.assetMetadata.assetLabels.join(",");
      return jQuery.ajax({
        url: this.assetMetadata.labelCreationUrl.replace("paths", listOfLabels),
        type: "POST",
        success: function(response) {
          return _this.assignLabels(response);
        },
        error: function(response) {
          return _this.onError(response, "Label creation error");
        }
      });
    };

    MovieUploader.prototype.assignLabels = function(responseCreationLabels) {
      var label, labelIds, parsedLabelsResponse,
        _this = this;
      parsedLabelsResponse = JSON.parse(responseCreationLabels);
      labelIds = (function() {
        var _i, _len, _results;
        _results = [];
        for (_i = 0, _len = parsedLabelsResponse.length; _i < _len; _i++) {
          label = parsedLabelsResponse[_i];
          _results.push(label["id"]);
        }
        return _results;
      })();
      return jQuery.ajax({
        url: this.assetMetadata.labelAssignmentUrl.replace("assetID", this.assetMetadata.assetID),
        type: "POST",
        data: JSON.stringify(labelIds),
        success: function(response) {
          return _this.onLabelsAssigned(response);
        },
        error: function(response) {
          return _this.onError(response, "Label assignment error");
        }
      });
    };

    MovieUploader.prototype.onLabelsAssigned = function(responseAssignLabels) {
      return console.log("Creation and assignment of labels complete " + this.assetMetadata.assetLabels);
    };

    MovieUploader.prototype.getUploadingUrls = function() {
      var _this = this;
      return jQuery.ajax({
        url: this.assetMetadata.assetUploadingUrl.split("assetID").join(this.assetMetadata.assetID),
        data: {
          asset_id: this.assetMetadata.assetID
        },
        success: function(response) {
          return _this.onUploadUrlsReceived(response);
        },
        error: function(response) {
          return _this.onError(response, "Error getting the uploading urls");
        }
      });
    };

    /*
    Uploading all chunks
    */


    MovieUploader.prototype.onUploadUrlsReceived = function(uploadingUrlsResponse) {
      var parsedUploadingUrl;
      parsedUploadingUrl = uploadingUrlsResponse;//JSON.parse(uploadingUrlsResponse);
      this.totalChunks = parsedUploadingUrl.length;
      if (this.uploaderType === "HTML5") {
        return this.startHTML5Upload(parsedUploadingUrl);
      } else {
        return this.startFlashUpload(parsedUploadingUrl);
      }
    };

    MovieUploader.prototype.startHTML5Upload = function(parsedUploadingUrl) {
      var chunks,
        _this = this;
      chunks = new FileSplitter(this.file, CHUNK_SIZE).getChunks();
      if (chunks.length !== this.totalChunks) {
        console.log("Sliced chunks (" + chunks.length + ") and uploadingUrls (" + this.totalChunks + ") disagree.");
      }
      return jQuery.each(chunks, function(index, chunk) {
        var chunkUploader;
        if (__indexOf.call(_this.completedChunkIndexes, index) >= 0) {
          return;
        }
        chunkUploader = new ChunkUploader({
          assetMetadata: _this.assetMetadata,
          chunkIndex: index,
          chunk: chunk,
          uploadUrl: parsedUploadingUrl[index],
          progress: _this.onChunkProgress,
          completed: _this.onChunkComplete,
          error: _this.uploadErrorCallback
        });
        _this.chunkUploaders[index] = chunkUploader;
        return chunkUploader.startUpload();
      });
    };

    MovieUploader.prototype.startFlashUpload = function(parsedUploadingUrl) {
      this.swfUploader.setUploadURL(parsedUploadingUrl[0]);
      return this.swfUploader.startUpload();
    };

    MovieUploader.prototype.onFlashUploadProgress = function(file, completedBytes, totalBytes) {
      var uploadedPercent;
      uploadedPercent = Math.floor((completedBytes * 100) / totalBytes);
      uploadedPercent = Math.min(100, uploadedPercent);
      return this.uploadProgressCallback(this.assetMetadata.assetID, uploadedPercent);
    };

    MovieUploader.prototype.onFlashUploadComplete = function(file, serverData, receivedResponse) {
      return this.onAssetUploadComplete();
    };

    MovieUploader.prototype.onFlashUploadError = function(file, errorCode, errorMessage) {
      return this.uploadErrorCallback({
        assetID: this.assetMetadata.assetID,
        type: this.assetMetadata.assetType,
        fileName: this.assetMetadata.assetName,
        statusCode: errorCode,
        message: errorMessage
      });
    };

    MovieUploader.prototype.progressPercent = function() {
      var bytesUploaded, bytesUploadedByInProgressChunks, chunkIndex, chunkUploader, uploadedPercent, _ref;
      bytesUploadedByInProgressChunks = 0;
      _ref = this.chunkUploaders;
      for (chunkIndex in _ref) {
        chunkUploader = _ref[chunkIndex];
        bytesUploadedByInProgressChunks += chunkUploader.bytesUploaded;
      }
      bytesUploaded = (this.completedChunks * CHUNK_SIZE) + bytesUploadedByInProgressChunks;
      uploadedPercent = Math.floor((bytesUploaded * 100) / this.assetMetadata.fileSize);
      /* uploadedPercent can be more than 100 since the last chunk may be less than CHUNK_SIZE*/

      return Math.min(100, uploadedPercent);
    };

    MovieUploader.prototype.onChunkProgress = function() {
      return this.uploadProgressCallback(this.assetMetadata.assetID, this.progressPercent());
    };

    MovieUploader.prototype.onChunkComplete = function(event, chunkIndex) {
      this.completedChunks++;
      this.completedChunkIndexes.push(chunkIndex);
      delete this.chunkUploaders[chunkIndex];
      this.onChunkProgress();
      if (this.completedChunks === this.totalChunks) {
        return this.onAssetUploadComplete();
      }
    };

    MovieUploader.prototype.onAssetUploadComplete = function() {
      var _this = this;
      return jQuery.ajax({
        url: this.assetMetadata.assetStatusUpdateUrl.split("assetID").join(this.assetMetadata.assetID),
        data: {
          asset_id: this.assetMetadata.assetID,
          status: "uploaded"
        },
        type: "PUT",
        success: function(data) {
          return _this.uploadCompleteCallback(_this.assetMetadata.assetID);
        },
        error: function(response) {
          return _this.onError(response, "Setting asset status as uploaded error");
        }
      });
    };

    MovieUploader.prototype.onError = function(response, clientMessage) {
      var errorMessage, parsedResponse, _;
      try {
        parsedResponse = JSON.parse(response.responseText);
        errorMessage = parsedResponse["message"];
      } catch (_error) {
        _ = _error;
        errorMessage = response.statusText;
      }
      console.log("" + this.assetMetadata.assetName + ": " + clientMessage + " with status " + response.status + ": " + errorMessage);
      return this.uploadErrorCallback({
        assetID: this.assetMetadata.assetID,
        type: this.assetMetadata.assetType,
        fileName: this.assetMetadata.assetName,
        statusCode: response.status,
        message: "" + clientMessage + ", " + errorMessage
      });
    };

    return MovieUploader;

  })();

  ChunkUploader = (function() {
    function ChunkUploader(options) {
      this.onXhrError = __bind(this.onXhrError, this);
      this.onXhrLoad = __bind(this.onXhrLoad, this);
      this.startUpload = __bind(this.startUpload, this);
      this.assetMetadata = options.assetMetadata;
      this.chunk = options.chunk;
      this.chunkIndex = options.chunkIndex;
      this.progressHandler = options.progress;
      this.completedHandler = options.completed;
      this.uploadErrorCallback = options.error;
      this.uploadUrl = options.uploadUrl;
      this.bytesUploaded = 0;
    }

    ChunkUploader.prototype.startUpload = function() {
      var _this = this;
      console.log("" + this.assetMetadata.assetID + ": Starting upload of chunk " + this.chunkIndex);
      this.xhr = new XMLHttpRequest();
      this.xhr.upload.addEventListener("progress", function(event) {
        _this.bytesUploaded = event.loaded;
        return _this.progressHandler();
      });
      this.xhr.addEventListener("load", this.onXhrLoad);
      this.xhr.addEventListener("error", this.onXhrError);
      this.xhr.open("PUT", this.uploadUrl);
      return this.xhr.send(this.chunk);
    };

    ChunkUploader.prototype.onXhrLoad = function(xhr) {
      var status;
      status = xhr.target.status;
      if (status >= 400) {
        return onXhrError(xhr);
      } else {
        this.bytesUploaded = CHUNK_SIZE;
        return this.completedHandler(xhr, this.chunkIndex);
      }
    };

    /*
    The XHR error event is only fired if there's a failure at the network level. For application errors
    (e.g. The request returns a 404), the browser fires an onload event
    */


    ChunkUploader.prototype.onXhrError = function(xhr) {
      var status;
      status = xhr.target.status;
      console.log("" + this.assetMetadata.assetID + ": chunk " + this.chunkIndex + ": Xhr Error Status " + status);
      return this.uploadErrorCallback({
        assetID: this.assetMetadata.assetID,
        type: this.assetMetadata.assetType,
        fileName: this.assetMetadata.assetName,
        statusCode: xhr.status,
        message: xhr.responseText
      });
    };

    return ChunkUploader;

  })();

  FileSplitter = (function() {
    function FileSplitter(file, chunkSize) {
      this.file = file;
      this.chunkSize = chunkSize;
    }

    /*
    Splits the file into several pieces according to CHUNK_SIZE. Returns an array of chunks.
    */


    FileSplitter.prototype.getChunks = function() {
      var i, _i, _ref, _results;
      if (!(this.file.slice || this.file.mozSlice)) {
        return [this.file];
      }
      _results = [];
      for (i = _i = 0, _ref = Math.ceil(this.file.size / this.chunkSize); 0 <= _ref ? _i < _ref : _i > _ref; i = 0 <= _ref ? ++_i : --_i) {
        _results.push(this.slice(i * this.chunkSize, (i + 1) * this.chunkSize));
      }
      return _results;
    };

    /*
    Gets a slice of the file. For example: consider a file of 100 bytes, slice(0,50) will give the first half
    of the file
    - start: index of the start byte
    - stop: index of the byte where the split should stop. If the stop is larger than the file size, stop will
    be the last byte.
    */


    FileSplitter.prototype.slice = function(start, stop) {
      if (this.file.slice) {
        return this.file.slice(start, stop);
      } else if (this.file.mozSlice) {
        return this.file.mozSlice(start, stop);
      }
    };

    return FileSplitter;

  })();

  
/**
 * Array.filter polyfil for IE8.
 *
 * https://gist.github.com/eliperelman/1031656
 */
[].filter || (Array.prototype.filter = // Use the native array filter method, if available.
  function(a, //a function to test each value of the array against. Truthy values will be put into the new array and falsy values will
    b, // placeholder
    c, // placeholder
    d, // placeholder
    e // placeholder
  ) {
      c = this; // cache the array
      d = []; // array to hold the new values which match the expression
      for (e in c) // for each value in the array,
        ~~e + '' == e && e >= 0 && // coerce the array position and if valid,
        a.call(b, c[e], +e, c) && // pass the current value into the expression and if truthy,
        d.push(c[e]); // add it to the new array

      return d // give back the new array
  });

}).call(this);
