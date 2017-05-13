/**
 * Copyright (c) 2006-2012, JGraph Ltd
 */
/**
 * Editor constructor executed on page load.
 */
Editor = function(chromeless, themes, model, graph)
{
	mxEventSource.call(this);
	this.chromeless = (chromeless != null) ? chromeless : this.chromeless;
	this.initStencilRegistry();
	this.graph = graph || this.createGraph(themes, model);
	this.undoManager = this.createUndoManager();
	this.status = '';

	this.getOrCreateFilename = function()
	{
		return this.filename || mxResources.get('drawing', [Editor.pageCounter]) + '.xml';
	};
	
	this.getFilename = function()
	{
		return this.filename;
	};
	
	// Sets the status and fires a statusChanged event
	this.setStatus = function(value)
	{
		this.status = value;
		this.fireEvent(new mxEventObject('statusChanged'));
	};
	
	// Returns the current status
	this.getStatus = function()
	{
		return this.status;
	};

	// Updates modified state if graph changes
	this.graphChangeListener = function(sender, eventObject) 
	{
		var edit = (eventObject != null) ? eventObject.getProperty('edit') : null;
				
		if (edit == null || !edit.ignoreEdit)
		{
			this.setModified(true);
		}
	};
	
	this.graph.getModel().addListener(mxEvent.CHANGE, mxUtils.bind(this, function()
	{
		this.graphChangeListener.apply(this, arguments);
	}));

	// Sets persistent graph state defaults
	this.graph.resetViewOnRootChange = false;
	this.init();
};

/**
 * Counts open editor tabs (must be global for cross-window access)
 */
Editor.pageCounter = 0;

// Cross-domain window access is not allowed in FF, so if we
// were opened from another domain then this will fail.
(function()
{
	try
	{
		var op = window;

		while (op.opener != null && typeof op.opener.Editor !== 'undefined' &&
			!isNaN(op.opener.Editor.pageCounter) &&	
			// Workaround for possible infinite loop in FF https://drawio.atlassian.net/browse/DS-795
			op.opener != op)
		{
			op = op.opener;
		}
		
		// Increments the counter in the first opener in the chain
		if (op != null)
		{
			op.Editor.pageCounter++;
			Editor.pageCounter = op.Editor.pageCounter;
		}
	}
	catch (e)
	{
		// ignore
	}
})();

/**
 * Specifies if local storage should be used (eg. on the iPad which has no filesystem)
 */
Editor.useLocalStorage = typeof(Storage) != 'undefined' && mxClient.IS_IOS;

/**
 * Images below are for lightbox and embedding toolbars.
 */
Editor.helpImage = (mxClient.IS_SVG) ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAXVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAC5BxTwAAAAH3RSTlMAlUF8boNQIE0LBgOgkGlHNSwqFIx/dGVUOjApmV9ezNACSAAAAIVJREFUGNNtjNsOgzAMQ5NeoVcKDAZs+//PXLKI8YKlWvaRU7jXuFpb9qsbdK05XILUiE8JHQox1Pv3OgFUzf1AGqWqUg+QBwLF0YAeegBlCNgRWOpB5vUfTCmeoHQ/wNdy0jLH/cM+b+wLTw4n/7ACEmHVVy8h6qy8V7MNcGowWpsNbvUFcGUEdSi1s/oAAAAASUVORK5CYII=' :
	IMAGE_PATH + '/help.png';

/**
 * Sets the default font size.
 */
Editor.checkmarkImage = (mxClient.IS_SVG) ? 'data:image/gif;base64,R0lGODlhFQAVAMQfAGxsbHx8fIqKioaGhvb29nJycvr6+sDAwJqamltbW5OTk+np6YGBgeTk5Ly8vJiYmP39/fLy8qWlpa6ursjIyOLi4vj4+N/f3+3t7fT09LCwsHZ2dubm5r6+vmZmZv///yH/C1hNUCBEYXRhWE1QPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS4wLWMwNjAgNjEuMTM0Nzc3LCAyMDEwLzAyLzEyLTE3OjMyOjAwICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtbG5zOnhtcE1NPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvbW0vIiB4bWxuczpzdFJlZj0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL3NUeXBlL1Jlc291cmNlUmVmIyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OEY4NTZERTQ5QUFBMTFFMUE5MTVDOTM5MUZGMTE3M0QiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OEY4NTZERTU5QUFBMTFFMUE5MTVDOTM5MUZGMTE3M0QiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4Rjg1NkRFMjlBQUExMUUxQTkxNUM5MzkxRkYxMTczRCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo4Rjg1NkRFMzlBQUExMUUxQTkxNUM5MzkxRkYxMTczRCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PgH//v38+/r5+Pf29fTz8vHw7+7t7Ovq6ejn5uXk4+Lh4N/e3dzb2tnY19bV1NPS0dDPzs3My8rJyMfGxcTDwsHAv769vLu6ubi3trW0s7KxsK+urayrqqmop6alpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgH9+fXx7enl4d3Z1dHNycXBvbm1sa2ppaGdmZWRjYmFgX15dXFtaWVhXVlVUU1JRUE9OTUxLSklIR0ZFRENCQUA/Pj08Ozo5ODc2NTQzMjEwLy4tLCsqKSgnJiUkIyIhIB8eHRwbGhkYFxYVFBMSERAPDg0MCwoJCAcGBQQDAgEAACH5BAEAAB8ALAAAAAAVABUAAAVI4CeOZGmeaKqubKtylktSgCOLRyLd3+QJEJnh4VHcMoOfYQXQLBcBD4PA6ngGlIInEHEhPOANRkaIFhq8SuHCE1Hb8Lh8LgsBADs=' :
	IMAGE_PATH + '/checkmark.gif';

/**
 * Images below are for lightbox and embedding toolbars.
 */
Editor.maximizeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVBAMAAABbObilAAAAElBMVEUAAAAAAAAAAAAAAAAAAAAAAADgKxmiAAAABXRSTlMA758vX1Pw3BoAAABJSURBVAjXY8AJQkODGBhUQ0MhbAUGBiYY24CBgRnGFmZgMISwgwwDGRhEhVVBbAVmEQYGRwMmBjIAQi/CTIRd6G5AuA3dzYQBAHj0EFdHkvV4AAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.zoomOutImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVBAMAAABbObilAAAAElBMVEUAAAAAAAAsLCxxcXEhISFgYGChjTUxAAAAAXRSTlMAQObYZgAAAEdJREFUCNdjIAMwCQrB2YKCggJQJqMwA7MglK1owMBgqABVApITgLJZXFxgbIQ4Qj3CHIT5ggoIe5kgNkM1KSDYKBKqxPkDAPo5BAZBE54hAAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.zoomInImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVBAMAAABbObilAAAAElBMVEUAAAAAAAAsLCwhISFxcXFgYGBavKaoAAAAAXRSTlMAQObYZgAAAElJREFUCNdjIAMwCQrB2YKCggJQJqMIA4sglK3owMzgqABVwsDMwCgAZTMbG8PYCHGEeoQ5CPMFFRD2MkFshmpSQLBRJFSJ8wcAEqcEM2uhl2MAAAAASUVORK5CYII=';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.zoomFitImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVBAMAAABbObilAAAAD1BMVEUAAAAAAAAwMDBwcHBgYGC1xl09AAAAAXRSTlMAQObYZgAAAEFJREFUCNdjIAMwCQrB2YKCggJQJqMwA7MglK1owMBgqABVApITwMdGqEeYgzBfUAFhLxPEZqgmBQQbRUKFOH8AAK5OA3lA+FFOAAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.layersImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABUAAAAVCAMAAACeyVWkAAAAaVBMVEUAAAAgICAICAgdHR0PDw8WFhYICAgLCwsXFxcvLy8ODg4uLi4iIiIqKiokJCQYGBgKCgonJycFBQUCAgIqKiocHBwcHBwODg4eHh4cHBwnJycJCQkUFBQqKiojIyMuLi4ZGRkgICAEBATOWYXAAAAAGnRSTlMAD7+fnz8/H7/ff18/77+vr5+fn39/b28fH2xSoKsAAACQSURBVBjTrYxJEsMgDARZZMAY73sgCcn/HxnhKtnk7j6oRq0psfuoyndZ/SuODkHPLzfVT6KeyPePnJ7KrnkRjWMXTn4SMnN8mXe2SSM3ts8L/ZUxxrbAULSYJJULE0Iw9pjpenoICcgcX61mGgTgtCv9Be99pzCoDhNQWQnchD1mup5++CYGcoQexajZbfwAj/0MD8ZOaUgAAAAASUVORK5CYII=';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.previousImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAAh0lEQVQ4je3UsQnCUBCA4U8hpa1NsoEjpHQJS0dxADdwEMuMIJkgA1hYChbGQgMi+JC8q4L/AB/vDu7x74cWWEZhJU44RmA1zujR5GIbXF9YNrjD/Q0bDRY4fEBZ4P4LlgTnCbAf84pUM8/9hY08tMUtEoQ1LpEgrNBFglChFXR6Q6GfwwR6AGKJMF74Vtt3AAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.nextImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAABmJLR0QA/wD/AP+gvaeTAAAAi0lEQVQ4jeXUIQ7CUAwA0MeGxWI2yylwnALJUdBcgYvM7QYLmjOQIAkIPmJZghiIvypoUtX0tfnJL38X5ZfaEgUeUcManFBHgS0SLlhHggk3bCPBhCf2keCQR8wjwYTDp6YiZxJmOU1jGw7vGALescuBxsArNlOwd/CM1VSM/ut1qCIw+uOwiMJ+OF4CQzBCXm3hyAAAAABJRU5ErkJggg==';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.zoomOutLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAilBMVEUAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////2N2iNAAAALXRSTlMA+vTcKMM96GRBHwXxi0YaX1HLrKWhiHpWEOnOr52Vb2xKSDcT19PKv5l/Ngdk8+viAAABJklEQVQ4y4WT2XaDMAxEvWD2nSSUNEnTJN3r//+9Sj7ILAY6L0ijC4ONYVZRpo6cByrz2YKSUGorGTpz71lPVHvT+avoB5wIkU/mxk8veceSuNoLg44IzziXjvpih72wKQnm8yc2UoiP/LAd8jQfe2Xf4Pq+2EyYIvv9wbzHHCgwxDdlBtWZOdqDfTCVgqpygQpsZaojVAVc9UjQxnAJDIBhiQv84tq3gMQCAVTxVoSibXJf8tMuc7e1TB/DCmejBNg/w1Y3c+AM5vv4w7xM59/oXamrHaLVqPQ+OTCnmMZxgz0SdL5zji0/ld6j88qGa5KIiBB6WeJGKfUKwSMKLuXgvl1TW0tm5R9UQL/efSDYsnzxD8CinhBsTTdugJatKpJwf8v+ADb8QmvW7AeAAAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.zoomInLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAilBMVEUAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////2N2iNAAAALXRSTlMA+vTcKMM96GRBHwXxi0YaX1HLrKWhiHpWEOnOr52Vb2xKSDcT19PKv5l/Ngdk8+viAAABKElEQVQ4y4WT6WKCMBCENwkBwn2oFKvWqr3L+79es4EkQIDOH2d3Pxk2ABiJlB8JCXjqw4LikHVGLHTm3nM3UeVN5690GBBN0GwyV/3kkrUQR+WeKnREeKpzaXWd77CmJiXGfPIEI4V4yQ9TIW/ntlcMBe731Vts9w5TWG8F5j3mQI4hvrKpdGeYA7CX9qAcl650gVJartxRuhyHVghF8idQAIbFLvCLu28BsQEC6aKtCK6Pyb3JT7PmbmtNH8Ny56CotD/2qOs5cJbuffxgXmCib+xddVU5RNOhkvvkhTlFehzVWCOh3++MYElOhfdovaImnRYVmqDdsuhNp1QrBBE6uGC2+3ZNjGdg5B94oD+9uyVgWT79BwAxEBTWdOu3bWBVgsn/N/AHUD9IC01Oe40AAAAASUVORK5CYII=';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.actualSizeLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAilBMVEUAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////2N2iNAAAALXRSTlMA+vTcKMM96GRBHwXxi0YaX1HLrKWhiHpWEOnOr52Vb2xKSDcT19PKv5l/Ngdk8+viAAABIUlEQVQ4y4WT2XqDIBCFBxDc9yTWNEnTJN3r+79eGT4BEbXnaubMr8dBBaM450dCQp4LWFAascGIRd48eB4cNYE7f6XjgGiCFs5c+dml6CFN6j1V6IQIlHPpdV/usKcmJcV88gQTRXjLD9Mhb+fWq8YG9/uCmTCFjeeDeY85UGKIUGUuqzN42kv7oCouq9oHamlzVR1lVfpAIu1QVRiW+sAv7r4FpAYIZZVsRXB9TP5Dfpo1d1trCgzz1iiptH/sUbdz4CzN9+mLeXHn3+hdddd4RDegsrvzwZwSs2GLPRJidAqCLTlVwaMPqpYMWjTWBB2WRW86pVkhSKyDK2bdt2tmagZG4sBD/evdLQHLEvQfAOKRoLCmG1FAB6uKmby+gz+REDn7O5+EwQAAAABJRU5ErkJggg==';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.layersLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAmVBMVEUAAAD////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////+/v7///+bnZkkAAAAMnRSTlMABPr8ByiD88KsTi/rvJb272mjeUA1CuPe1M/KjVxYHxMP6KZ0S9nYzGRGGRaznpGIbzaGUf0AAAHESURBVDjLbZLZYoIwEEVDgLCjbKIgAlqXqt3m/z+uNwu1rcyDhjl3ktnYL7OY254C0VX3yWFZfzDrOClbbgKxi0YDHjwl4jbnRkXxJS/C1YP3DbBhD1n7Ex4uaAqdVDb3yJ/4J/3nJD2to/ngQz/DfUvzMp4JJ5sSCaF5oXmemgQDfDxzbi+Kq4sU+vNcuAmx94JtyOP2DD4Epz2asWSCz4Z/4fECxyNj9zC9xNLHcdPEO+awDKeSaUu0W4twZQiO2hYVisTR3RCtK/c1X6t4xMEpiGqXqVntEBLolkZZsKY4QtwH6jzq67dEHlJysB1aNOD3XT7n1UkasQN59L4yC2RELMDSeCRtz3yV22Ub3ozIUTknYx8JWqDdQxbUes98cR2kZtUSveF/bAhcedwEWmlxIkpZUy4XOCb6VBjjxHvbwo/1lBAHHi2JCr0NI570QhyHq/DhJoE2lLgyA4RVe6KmZ47O/3b86MCP0HWa73A8/C3SUc5Qc1ajt6fgpXJ+RGpMvDSchepZDOOQRcZVIKcK90x2D7etqtI+56+u6n3sPriO6nfphitR4+O2m3EbM7lh3me1FM1o+LMI887rN+s3/wZdTFlpNVJiOAAAAABJRU5ErkJggg==';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.closeLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAUVBMVEUAAAD///////////////////////////////////////////////////////////////////////////////////////////////////////8IN+deAAAAGnRSTlMAuvAIg/dDM/QlOeuFhj0S5s4vKgzjxJRQNiLSey0AAADNSURBVDjLfZLbEoMgDEQjRRRs1XqX///QNmOHJSnjPkHOGR7IEmeoGtJZstnwjqbRfIsmgEdtPCqe9Ynz7ZSc07rE2QiSc+qv8TvjRXA2PDUm3dpe82iJhOEUfxJJo3aCv+jKmRmH4lcCjCjeh9GWOdL/GZZkXH3PYYDrHBnfc4D/RVZf5sjoC1was+Y6HQxwaUxFvq/a0Pv343VCTxfBSRiB+ab3M3eiQZXmMNBJ3Y8pGRZtYQ7DgHMXJEdPLTaN/qBjzJOBc3nmNcbsA16bMR0oLqf+AAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.editLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgAgMAAAAOFJJnAAAACVBMVEUAAAD///////9zeKVjAAAAAnRSTlMAgJsrThgAAABcSURBVBjThc6xDcAgDATAd8MQTEPW8TRUmYCGnzLRYyOlIV+dZFtvkICTFGqiJEzAG0/Uje9oL+e5Vu4F5yUYJxxqGKhQZ0eBvmgwYQLQaARKD1hbiPyDR0QOeAC31EyNe5X/kAAAAABJRU5ErkJggg==';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.previousLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAPFBMVEUAAAD////////////////////////////////////////////////////////////////////////////YSWgTAAAAE3RSTlMA7fci493c0MW8uJ6CZks4MxQHEZL6ewAAAFZJREFUOMvdkskRgDAMA4lDwg2B7b9XOlge/KKvdsa25KFb5XlRvxXC/DNBEv8IFNjBgGdDgXtFgTyhwDXiQAUHCvwa4Uv6mR6UR+1led2mVonvl+tML45qCQNQLIx7AAAAAElFTkSuQmCC';

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.nextLargeImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAMAAABEpIrGAAAAPFBMVEUAAAD////////////////////////////////////////////////////////////////////////////YSWgTAAAAE3RSTlMA7fci493c0MW8uJ6CZks4MxQHEZL6ewAAAFRJREFUOMvd0skRgCAQBVEFwQ0V7fxzNQP6wI05v6pZ/kyj1b7FNgik2gQzzLcAwiUAigHOTwDHK4A1CmB5BJANJG1hQ9qafYcqFlZP3IFc9eVGrR+iIgkDQRUXIAAAAABJRU5ErkJggg==';

// Editor inherits from mxEventSource
mxUtils.extend(Editor, mxEventSource);

/**
 * Stores initial state of mxClient.NO_FO.
 */
Editor.prototype.originalNoForeignObject = mxClient.NO_FO;

/**
 * Specifies the image URL to be used for the transparent background.
 */
Editor.prototype.transparentImage = (mxClient.IS_SVG) ? 'data:image/gif;base64,R0lGODlhMAAwAIAAAP///wAAACH5BAEAAAAALAAAAAAwADAAAAIxhI+py+0Po5y02ouz3rz7D4biSJbmiabqyrbuC8fyTNf2jef6zvf+DwwKh8Si8egpAAA7' :
	IMAGE_PATH + '/transparent.gif';

/**
 * Specifies if the canvas should be extended in all directions. Default is true.
 */
Editor.prototype.extendCanvas = true;

/**
 * Specifies if the app should run in chromeless mode. Default is false.
 * This default is only used if the contructor argument is null.
 */
Editor.prototype.chromeless = false;

/**
 * Specifies the order of OK/Cancel buttons in dialogs. Default is true.
 * Cancel first is used on Macs, Windows/Confluence uses cancel last.
 */
Editor.prototype.cancelFirst = true;

/**
 * Specifies if the editor is enabled. Default is true.
 */
Editor.prototype.enabled = true;

/**
 * Contains the name which was used for the last save. Default value is null.
 */
Editor.prototype.filename = null;

/**
 * Contains the current modified state of the diagram. This is false for
 * new diagrams and after the diagram was saved.
 */
Editor.prototype.modified = false;

/**
 * Specifies if the diagram should be saved automatically if possible. Default
 * is true.
 */
Editor.prototype.autosave = true;

/**
 * Specifies the top spacing for the initial page view. Default is 0.
 */
Editor.prototype.initialTopSpacing = 0;

/**
 * Specifies the app name. Default is document.title.
 */
Editor.prototype.appName = document.title;

/**
 * 
 */
Editor.prototype.editBlankUrl = window.location.protocol + '//' + window.location.host + '/?client=1';

/**
 * 
 */
Editor.prototype.editBlankFallbackUrl = window.location.protocol + '//' + window.location.host + '/?create=drawdata&splash=0';

/**
 * Initializes the environment.
 */
Editor.prototype.init = function() { };

/**
 * Sets the XML node for the current diagram.
 */
Editor.prototype.setAutosave = function(value)
{
	this.autosave = value;
	this.fireEvent(new mxEventObject('autosaveChanged'));
};

/**
 * 
 */
Editor.prototype.getEditBlankUrl = function(params, fallback)
{
	return ((fallback) ? this.editBlankFallbackUrl : this.editBlankUrl) + params;
}

/**
 * 
 */
Editor.prototype.editAsNew = function(xml, title)
{
	var p = (title != null) ? '&title=' + encodeURIComponent(title) : '';
	
	if (typeof window.postMessage !== 'undefined' && (document.documentMode == null || document.documentMode >= 10))
	{
		var wnd = null;
		
		var receive = mxUtils.bind(this, function(evt)
		{
			if (evt.data == 'ready' && evt.source == wnd)
			{
				wnd.postMessage(xml, '*');
				mxEvent.removeListener(window, 'message', receive);
			}
		});
		
		mxEvent.addListener(window, 'message', receive);
		wnd = window.open(this.getEditBlankUrl(p, false));
	}
	else
	{
		// Data is pulled from global variable after tab loads
		window.drawdata = xml;
		window.open(this.getEditBlankUrl(p, true));
	}
};

/**
 * Sets the XML node for the current diagram.
 */
Editor.prototype.createGraph = function(themes, model)
{
	var graph = new Graph(null, model, null, null, themes);
	graph.transparentBackground = false;
	
	// Opens all links in a new window while editing
	if (!this.chromeless)
	{
		graph.isBlankLink = function(href)
		{
			return !this.isExternalProtocol(href);
		};
	}
	
	return graph;
};

/**
 * Sets the XML node for the current diagram.
 */
Editor.prototype.resetGraph = function()
{
	this.graph.gridEnabled = !this.chromeless || urlParams['grid'] == '1';
	this.graph.graphHandler.guidesEnabled = true;
	this.graph.setTooltips(true);
	this.graph.setConnectable(true);
	this.graph.foldingEnabled = true;
	this.graph.scrollbars = this.graph.defaultScrollbars;
	this.graph.pageVisible = this.graph.defaultPageVisible;
	this.graph.pageBreaksVisible = this.graph.pageVisible; 
	this.graph.preferPageSize = this.graph.pageBreaksVisible;
	this.graph.background = this.graph.defaultGraphBackground;
	this.graph.pageScale = mxGraph.prototype.pageScale;
	this.graph.pageFormat = mxGraph.prototype.pageFormat;
	this.updateGraphComponents();
	this.graph.view.setScale(1);
};

/**
 * Sets the XML node for the current diagram.
 */
Editor.prototype.readGraphState = function(node)
{
	this.graph.gridEnabled = node.getAttribute('grid') != '0' && (!this.chromeless || urlParams['grid'] == '1');
	this.graph.gridSize = parseFloat(node.getAttribute('gridSize')) || mxGraph.prototype.gridSize;
	this.graph.graphHandler.guidesEnabled = node.getAttribute('guides') != '0';
	this.graph.setTooltips(node.getAttribute('tooltips') != '0');
	this.graph.setConnectable(node.getAttribute('connect') != '0');
	this.graph.connectionArrowsEnabled = node.getAttribute('arrows') != '0';
	this.graph.foldingEnabled = node.getAttribute('fold') != '0';

	if (this.chromeless && this.graph.foldingEnabled)
	{
		this.graph.foldingEnabled = urlParams['nav'] == '1';
		this.graph.cellRenderer.forceControlClickHandler = this.graph.foldingEnabled;
	}
	
	var ps = node.getAttribute('pageScale');
	
	if (ps != null)
	{
		this.graph.pageScale = ps;
	}
	else
	{
		this.graph.pageScale = mxGraph.prototype.pageScale;
	}

	if (!this.graph.lightbox)
	{
		var pv = node.getAttribute('page');
	
		if (pv != null)
		{
			this.graph.pageVisible = (pv != '0');
		}
		else
		{
			this.graph.pageVisible = this.graph.defaultPageVisible;
		}
	}
	else
	{
		this.graph.pageVisible = false;
	}
	
	this.graph.pageBreaksVisible = this.graph.pageVisible; 
	this.graph.preferPageSize = this.graph.pageBreaksVisible;
	
	var pw = node.getAttribute('pageWidth');
	var ph = node.getAttribute('pageHeight');
	
	if (pw != null && ph != null)
	{
		this.graph.pageFormat = new mxRectangle(0, 0, parseFloat(pw), parseFloat(ph));
	}

	// Loads the persistent state settings
	var bg = node.getAttribute('background');
	
	if (bg != null && bg.length > 0)
	{
		this.graph.background = bg;
	}
	else
	{
		this.graph.background = this.graph.defaultGraphBackground;
	}
};

/**
 * Sets the XML node for the current diagram.
 */
Editor.prototype.setGraphXml = function(node)
{
	if (node != null)
	{
		var dec = new mxCodec(node.ownerDocument);
	
		if (node.nodeName == 'mxGraphModel')
		{
			this.graph.model.beginUpdate();
			
			try
			{
				this.graph.model.clear();
				this.graph.view.scale = 1;
				this.readGraphState(node);
				this.updateGraphComponents();
				dec.decode(node, this.graph.getModel());
			}
			finally
			{
				this.graph.model.endUpdate();
			}
	
			this.fireEvent(new mxEventObject('resetGraphView'));
		}
		else if (node.nodeName == 'root')
		{
			this.resetGraph();
			
			// Workaround for invalid XML output in Firefox 20 due to bug in mxUtils.getXml
			var wrapper = dec.document.createElement('mxGraphModel');
			wrapper.appendChild(node);
			
			dec.decode(wrapper, this.graph.getModel());
			this.updateGraphComponents();
			this.fireEvent(new mxEventObject('resetGraphView'));
		}
		else
		{
			throw { 
			    message: mxResources.get('cannotOpenFile'), 
			    node: node,
			    toString: function() { return this.message; }
			};
		}
	}
	else
	{
		this.resetGraph();
		this.graph.model.clear();
		this.fireEvent(new mxEventObject('resetGraphView'));
	}
};

/**
 * Returns the XML node that represents the current diagram.
 */
Editor.prototype.getGraphXml = function(ignoreSelection)
{
	ignoreSelection = (ignoreSelection != null) ? ignoreSelection : true;
	var node = null;
	
	if (ignoreSelection)
	{
		var enc = new mxCodec(mxUtils.createXmlDocument());
		node = enc.encode(this.graph.getModel());
	}
	else
	{
		node = this.graph.encodeCells(mxUtils.sortCells(this.graph.model.getTopmostCells(
			this.graph.getSelectionCells())));
	}

	if (this.graph.view.translate.x != 0 || this.graph.view.translate.y != 0)
	{
		node.setAttribute('dx', Math.round(this.graph.view.translate.x * 100) / 100);
		node.setAttribute('dy', Math.round(this.graph.view.translate.y * 100) / 100);
	}
	
	node.setAttribute('grid', (this.graph.isGridEnabled()) ? '1' : '0');
	node.setAttribute('gridSize', this.graph.gridSize);
	node.setAttribute('guides', (this.graph.graphHandler.guidesEnabled) ? '1' : '0');
	node.setAttribute('tooltips', (this.graph.tooltipHandler.isEnabled()) ? '1' : '0');
	node.setAttribute('connect', (this.graph.connectionHandler.isEnabled()) ? '1' : '0');
	node.setAttribute('arrows', (this.graph.connectionArrowsEnabled) ? '1' : '0');
	node.setAttribute('fold', (this.graph.foldingEnabled) ? '1' : '0');
	node.setAttribute('page', (this.graph.pageVisible) ? '1' : '0');
	node.setAttribute('pageScale', this.graph.pageScale);
	node.setAttribute('pageWidth', this.graph.pageFormat.width);
	node.setAttribute('pageHeight', this.graph.pageFormat.height);

	if (this.graph.background != null)
	{
		node.setAttribute('background', this.graph.background);
	}
	
	return node;
};

/**
 * Keeps the graph container in sync with the persistent graph state
 */
Editor.prototype.updateGraphComponents = function()
{
	var graph = this.graph;
	
	if (graph.container != null)
	{
		graph.view.validateBackground();
		graph.container.style.overflow = (graph.scrollbars) ? 'auto' : 'hidden';
		
		this.fireEvent(new mxEventObject('updateGraphComponents'));
	}
};

/**
 * Sets the modified flag.
 */
Editor.prototype.setModified = function(value)
{
	this.modified = value;
};

/**
 * Sets the filename.
 */
Editor.prototype.setFilename = function(value)
{
	this.filename = value;
};

/**
 * Creates and returns a new undo manager.
 */
Editor.prototype.createUndoManager = function()
{
	var graph = this.graph;
	var undoMgr = new mxUndoManager();

	this.undoListener = function(sender, evt)
	{
		undoMgr.undoableEditHappened(evt.getProperty('edit'));
	};
	
    // Installs the command history
	var listener = mxUtils.bind(this, function(sender, evt)
	{
		this.undoListener.apply(this, arguments);
	});
	
	graph.getModel().addListener(mxEvent.UNDO, listener);
	graph.getView().addListener(mxEvent.UNDO, listener);

	// Keeps the selection in sync with the history
	var undoHandler = function(sender, evt)
	{
		var cand = graph.getSelectionCellsForChanges(evt.getProperty('edit').changes);
		var model = graph.getModel();
		var cells = [];
		
		for (var i = 0; i < cand.length; i++)
		{
			if ((model.isVertex(cand[i]) || model.isEdge(cand[i])) && graph.view.getState(cand[i]) != null)
			{
				cells.push(cand[i]);
			}
		}
		
		graph.setSelectionCells(cells);
	};
	
	undoMgr.addListener(mxEvent.UNDO, undoHandler);
	undoMgr.addListener(mxEvent.REDO, undoHandler);

	return undoMgr;
};

/**
 * Adds basic stencil set (no namespace).
 */
Editor.prototype.initStencilRegistry = function() { };

/**
 * Creates and returns a new undo manager.
 */
Editor.prototype.destroy = function()
{
	if (this.graph != null)
	{
		this.graph.destroy();
		this.graph = null;
	}
};

/**
 * Class for asynchronously opening a new window and loading a file at the same
 * time. This acts as a bridge between the open dialog and the new editor.
 */
OpenFile = function(done)
{
	this.producer = null;
	this.consumer = null;
	this.done = done;
	this.args = null;
};

/**
 * Registers the editor from the new window.
 */
OpenFile.prototype.setConsumer = function(value)
{
	this.consumer = value;
	this.execute();
};

/**
 * Sets the data from the loaded file.
 */
OpenFile.prototype.setData = function()
{
	this.args = arguments;
	this.execute();
};

/**
 * Displays an error message.
 */
OpenFile.prototype.error = function(msg)
{
	this.cancel(true);
	mxUtils.alert(msg);
};

/**
 * Consumes the data.
 */
OpenFile.prototype.execute = function()
{
	if (this.consumer != null && this.args != null)
	{
		this.cancel(false);
		this.consumer.apply(this, this.args);
	}
};

/**
 * Cancels the operation.
 */
OpenFile.prototype.cancel = function(cancel)
{
	if (this.done != null)
	{
		this.done((cancel != null) ? cancel : true);
	}
};

/**
 * Static overrides
 */
(function()
{
	// Uses HTML for background pages (to support grid background image)
	mxGraphView.prototype.validateBackgroundPage = function()
	{
		var graph = this.graph;
		
		if (graph.container != null && !graph.transparentBackground)
		{
			if (graph.pageVisible)
			{
				var bounds = this.getBackgroundPageBounds();
				
				if (this.backgroundPageShape == null)
				{
					// Finds first element in graph container
					var firstChild = graph.container.firstChild;
					
					while (firstChild != null && firstChild.nodeType != mxConstants.NODETYPE_ELEMENT)
					{
						firstChild = firstChild.nextSibling;
					}
					
					if (firstChild != null)
					{
						this.backgroundPageShape = this.createBackgroundPageShape(bounds);
						this.backgroundPageShape.scale = 1;
						
						// Shadow filter causes problems in outline window in quirks mode. IE8 standards
						// also has known rendering issues inside mxWindow but not using shadow is worse.
						this.backgroundPageShape.isShadow = !mxClient.IS_QUIRKS;
						this.backgroundPageShape.dialect = mxConstants.DIALECT_STRICTHTML;
						this.backgroundPageShape.init(graph.container);
	
						// Required for the browser to render the background page in correct order
						firstChild.style.position = 'absolute';
						graph.container.insertBefore(this.backgroundPageShape.node, firstChild);
						this.backgroundPageShape.redraw();
						
						this.backgroundPageShape.node.className = 'geBackgroundPage';
						
						// Adds listener for double click handling on background
						mxEvent.addListener(this.backgroundPageShape.node, 'dblclick',
							mxUtils.bind(this, function(evt)
							{
								graph.dblClick(evt);
							})
						);
						
						// Adds basic listeners for graph event dispatching outside of the
						// container and finishing the handling of a single gesture
						mxEvent.addGestureListeners(this.backgroundPageShape.node,
							mxUtils.bind(this, function(evt)
							{
								graph.fireMouseEvent(mxEvent.MOUSE_DOWN, new mxMouseEvent(evt));
							}),
							mxUtils.bind(this, function(evt)
							{
								// Hides the tooltip if mouse is outside container
								if (graph.tooltipHandler != null && graph.tooltipHandler.isHideOnHover())
								{
									graph.tooltipHandler.hide();
								}
								
								if (graph.isMouseDown && !mxEvent.isConsumed(evt))
								{
									graph.fireMouseEvent(mxEvent.MOUSE_MOVE, new mxMouseEvent(evt));
								}
							}),
							mxUtils.bind(this, function(evt)
							{
								graph.fireMouseEvent(mxEvent.MOUSE_UP, new mxMouseEvent(evt));
							})
						);
					}
				}
				else
				{
					this.backgroundPageShape.scale = 1;
					this.backgroundPageShape.bounds = bounds;
					this.backgroundPageShape.redraw();
				}
			}
			else if (this.backgroundPageShape != null)
			{
				this.backgroundPageShape.destroy();
				this.backgroundPageShape = null;
			}
			
			this.validateBackgroundStyles();
		}
	};

	// Updates the CSS of the background to draw the grid
	mxGraphView.prototype.validateBackgroundStyles = function()
	{
		var graph = this.graph;
		var color = (graph.background == null || graph.background == mxConstants.NONE) ? '#ffffff' : graph.background;
		var gridColor = (this.gridColor != color.toLowerCase()) ? this.gridColor : '#ffffff';
		var image = 'none';
		var position = '';
		
		if (graph.isGridEnabled())
		{
			var phase = 10;
			
			if (mxClient.IS_SVG)
			{
				// Generates the SVG required for drawing the dynamic grid
				image = unescape(encodeURIComponent(this.createSvgGrid(gridColor)));
				image = (window.btoa) ? btoa(image) : Base64.encode(image, true);
				image = 'url(' + 'data:image/svg+xml;base64,' + image + ')'
				phase = graph.gridSize * this.scale * this.gridSteps;
			}
			else
			{
				// Fallback to grid wallpaper with fixed size
				image = 'url(' + this.gridImage + ')';
			}
			
			var x0 = 0;
			var y0 = 0;
			
			if (graph.view.backgroundPageShape != null)
			{
				var bds = this.getBackgroundPageBounds();
				
				x0 = 1 + bds.x;
				y0 = 1 + bds.y;
			}
			
			// Computes the offset to maintain origin for grid
			position = -Math.round(phase - mxUtils.mod(this.translate.x * this.scale - x0, phase)) + 'px ' +
				-Math.round(phase - mxUtils.mod(this.translate.y * this.scale - y0, phase)) + 'px';
		}
		
		var canvas = graph.view.canvas;
		
		if (canvas.ownerSVGElement != null)
		{
			canvas = canvas.ownerSVGElement;
		}
		
		if (graph.view.backgroundPageShape != null)
		{
			graph.view.backgroundPageShape.node.style.backgroundPosition = position;
			graph.view.backgroundPageShape.node.style.backgroundImage = image;
			graph.view.backgroundPageShape.node.style.backgroundColor = color;
			graph.container.className = 'geDiagramContainer geDiagramBackdrop';
			canvas.style.backgroundImage = 'none';
			canvas.style.backgroundColor = '';
		}
		else
		{
			graph.container.className = 'geDiagramContainer';
			canvas.style.backgroundPosition = position;
			canvas.style.backgroundColor = color;
			canvas.style.backgroundImage = image;
		}
	};
	
	// Returns the SVG required for painting the background grid.
	mxGraphView.prototype.createSvgGrid = function(color)
	{
		var tmp = this.graph.gridSize * this.scale;
		
		while (tmp < this.minGridSize)
		{
			tmp *= 2;
		}
		
		var tmp2 = this.gridSteps * tmp;
		
		// Small grid lines
		var d = [];
		
		for (var i = 1; i < this.gridSteps; i++)
		{
			var tmp3 = i * tmp;
			d.push('M 0 ' + tmp3 + ' L ' + tmp2 + ' ' + tmp3 + ' M ' + tmp3 + ' 0 L ' + tmp3 + ' ' + tmp2);
		}
		
		// KNOWN: Rounding errors for certain scales (eg. 144%, 121% in Chrome, FF and Safari). Workaround
		// in Chrome is to use 100% for the svg size, but this results in blurred grid for large diagrams.
		var size = tmp2;
		var svg =  '<svg width="' + size + '" height="' + size + '" xmlns="' + mxConstants.NS_SVG + '">' +
		    '<defs><pattern id="grid" width="' + tmp2 + '" height="' + tmp2 + '" patternUnits="userSpaceOnUse">' +
		    '<path d="' + d.join(' ') + '" fill="none" stroke="' + color + '" opacity="0.2" stroke-width="1"/>' +
		    '<path d="M ' + tmp2 + ' 0 L 0 0 0 ' + tmp2 + '" fill="none" stroke="' + color + '" stroke-width="1"/>' +
		    '</pattern></defs><rect width="100%" height="100%" fill="url(#grid)"/></svg>';

		return svg;
	};

	// Adds panning for the grid with no page view and disabled scrollbars
	var mxGraphPanGraph = mxGraph.prototype.panGraph;
	mxGraph.prototype.panGraph = function(dx, dy)
	{
		mxGraphPanGraph.apply(this, arguments);
		
		if (this.shiftPreview1 != null)
		{
			var canvas = this.view.canvas;
			
			if (canvas.ownerSVGElement != null)
			{
				canvas = canvas.ownerSVGElement;
			}
			
			var phase = this.gridSize * this.view.scale * this.view.gridSteps;
			var position = -Math.round(phase - mxUtils.mod(this.view.translate.x * this.view.scale + dx, phase)) + 'px ' +
				-Math.round(phase - mxUtils.mod(this.view.translate.y * this.view.scale + dy, phase)) + 'px';
			canvas.style.backgroundPosition = position;
		}
	};
	
	// Draws page breaks only within the page
	mxGraph.prototype.updatePageBreaks = function(visible, width, height)
	{
		var scale = this.view.scale;
		var tr = this.view.translate;
		var fmt = this.pageFormat;
		var ps = scale * this.pageScale;

		var bounds2 = this.view.getBackgroundPageBounds();

		width = bounds2.width;
		height = bounds2.height;
		var bounds = new mxRectangle(scale * tr.x, scale * tr.y, fmt.width * ps, fmt.height * ps);

		// Does not show page breaks if the scale is too small
		visible = visible && Math.min(bounds.width, bounds.height) > this.minPageBreakDist;

		var horizontalCount = (visible) ? Math.ceil(height / bounds.height) - 1 : 0;
		var verticalCount = (visible) ? Math.ceil(width / bounds.width) - 1 : 0;
		var right = bounds2.x + width;
		var bottom = bounds2.y + height;

		if (this.horizontalPageBreaks == null && horizontalCount > 0)
		{
			this.horizontalPageBreaks = [];
		}
		
		if (this.verticalPageBreaks == null && verticalCount > 0)
		{
			this.verticalPageBreaks = [];
		}
			
		var drawPageBreaks = mxUtils.bind(this, function(breaks)
		{
			if (breaks != null)
			{
				var count = (breaks == this.horizontalPageBreaks) ? horizontalCount : verticalCount; 
				
				for (var i = 0; i <= count; i++)
				{
					var pts = (breaks == this.horizontalPageBreaks) ?
						[new mxPoint(Math.round(bounds2.x), Math.round(bounds2.y + (i + 1) * bounds.height)),
						 new mxPoint(Math.round(right), Math.round(bounds2.y + (i + 1) * bounds.height))] :
						[new mxPoint(Math.round(bounds2.x + (i + 1) * bounds.width), Math.round(bounds2.y)),
						 new mxPoint(Math.round(bounds2.x + (i + 1) * bounds.width), Math.round(bottom))];
					
					if (breaks[i] != null)
					{
						breaks[i].points = pts;
						breaks[i].redraw();
					}
					else
					{
						var pageBreak = new mxPolyline(pts, this.pageBreakColor);
						pageBreak.dialect = this.dialect;
						pageBreak.isDashed = this.pageBreakDashed;
						pageBreak.pointerEvents = false;
						pageBreak.init(this.view.backgroundPane);
						pageBreak.redraw();
						
						breaks[i] = pageBreak;
					}
				}
				
				for (var i = count; i < breaks.length; i++)
				{
					breaks[i].destroy();
				}
				
				breaks.splice(count, breaks.length - count);
			}
		});
			
		drawPageBreaks(this.horizontalPageBreaks);
		drawPageBreaks(this.verticalPageBreaks);
	};
	
	// Disables removing relative children from parents
	var mxGraphHandlerShouldRemoveCellsFromParent = mxGraphHandler.prototype.shouldRemoveCellsFromParent;
	mxGraphHandler.prototype.shouldRemoveCellsFromParent = function(parent, cells, evt)
	{
		for (var i = 0; i < cells.length; i++)
		{
			if (this.graph.getModel().isVertex(cells[i]))
			{
				var geo = this.graph.getCellGeometry(cells[i]);
				
				if (geo != null && geo.relative)
				{
					return false;
				}
			}
		}
		
		return mxGraphHandlerShouldRemoveCellsFromParent.apply(this, arguments);
	};

	// Overrides to ignore hotspot only for target terminal
	var mxConnectionHandlerCreateMarker = mxConnectionHandler.prototype.createMarker;
	mxConnectionHandler.prototype.createMarker = function()
	{
		var marker = mxConnectionHandlerCreateMarker.apply(this, arguments);
		
		marker.intersects = mxUtils.bind(this, function(state, evt)
		{
			if (this.isConnecting())
			{
				return true;
			}
			
			return mxCellMarker.prototype.intersects.apply(marker, arguments);
		});
		
		return marker;
	};

	// Creates background page shape
	mxGraphView.prototype.createBackgroundPageShape = function(bounds)
	{
		return new mxRectangleShape(bounds, '#ffffff', '#cacaca');
	};

	// Fits the number of background pages to the graph
	mxGraphView.prototype.getBackgroundPageBounds = function()
	{
		var gb = this.getGraphBounds();
		
		// Computes unscaled, untranslated graph bounds
		var x = (gb.width > 0) ? gb.x / this.scale - this.translate.x : 0;
		var y = (gb.height > 0) ? gb.y / this.scale - this.translate.y : 0;
		var w = gb.width / this.scale;
		var h = gb.height / this.scale;
		
		var fmt = this.graph.pageFormat;
		var ps = this.graph.pageScale;

		var pw = fmt.width * ps;
		var ph = fmt.height * ps;

		var x0 = Math.floor(Math.min(0, x) / pw);
		var y0 = Math.floor(Math.min(0, y) / ph);
		var xe = Math.ceil(Math.max(1, x + w) / pw);
		var ye = Math.ceil(Math.max(1, y + h) / ph);
		
		var rows = xe - x0;
		var cols = ye - y0;

		var bounds = new mxRectangle(this.scale * (this.translate.x + x0 * pw), this.scale *
				(this.translate.y + y0 * ph), this.scale * rows * pw, this.scale * cols * ph);
		
		return bounds;
	};
	
	// Add panning for background page in VML
	var graphPanGraph = mxGraph.prototype.panGraph;
	mxGraph.prototype.panGraph = function(dx, dy)
	{
		graphPanGraph.apply(this, arguments);
		
		if ((this.dialect != mxConstants.DIALECT_SVG && this.view.backgroundPageShape != null) &&
			(!this.useScrollbarsForPanning || !mxUtils.hasScrollbars(this.container)))
		{
			this.view.backgroundPageShape.node.style.marginLeft = dx + 'px';
			this.view.backgroundPageShape.node.style.marginTop = dy + 'px';
		}
	};

	/**
	 * Consumes click events for disabled menu items.
	 */
	var mxPopupMenuAddItem = mxPopupMenu.prototype.addItem;
	mxPopupMenu.prototype.addItem = function(title, image, funct, parent, iconCls, enabled)
	{
		var result = mxPopupMenuAddItem.apply(this, arguments);
		
		if (enabled != null && !enabled)
		{
			mxEvent.addListener(result, 'mousedown', function(evt)
			{
				mxEvent.consume(evt);
			});
		}
		
		return result;
	};

	// Selects ancestors before descendants
	var graphHandlerGetInitialCellForEvent = mxGraphHandler.prototype.getInitialCellForEvent;
	mxGraphHandler.prototype.getInitialCellForEvent = function(me)
	{
		var model = this.graph.getModel();
		var psel = model.getParent(this.graph.getSelectionCell());
		var cell = graphHandlerGetInitialCellForEvent.apply(this, arguments);
		var parent = model.getParent(cell);
		
		if (psel == null || (psel != cell && psel != parent))
		{
			while (!this.graph.isCellSelected(cell) && !this.graph.isCellSelected(parent) &&
				model.isVertex(parent) && !this.graph.isContainer(parent))
			{
				cell = parent;
				parent = this.graph.getModel().getParent(cell);
			}
		}
		
		return cell;
	};
	
	// Selection is delayed to mouseup if ancestor is selected
	var graphHandlerIsDelayedSelection = mxGraphHandler.prototype.isDelayedSelection;
	mxGraphHandler.prototype.isDelayedSelection = function(cell, me)
	{
		var result = graphHandlerIsDelayedSelection.apply(this, arguments);
		
		if (!result)
		{
			var model = this.graph.getModel();
			var parent = model.getParent(cell);
			
			while (parent != null)
			{
				// Inconsistency for unselected parent swimlane is intended for easier moving
				// of stack layouts where the container title section is too far away
				if (this.graph.isCellSelected(parent) && model.isVertex(parent))
				{
					result = true;
					break;
				}
				
				parent = model.getParent(parent);
			}
		}
		
		return result;
	};
	
	// Delayed selection of parent group
	mxGraphHandler.prototype.selectDelayed = function(me)
	{
		if (!this.graph.popupMenuHandler.isPopupTrigger(me))
		{
			var cell = me.getCell();
			
			if (cell == null)
			{
				cell = this.cell;
			}

			// Selects folded cell for hit on folding icon
			var state = this.graph.view.getState(cell)
			
			if (state != null && me.isSource(state.control))
			{
				this.graph.selectCellForEvent(cell, me.getEvent());
			}
			else
			{
				var model = this.graph.getModel();
				var parent = model.getParent(cell);
				
				while (!this.graph.isCellSelected(parent) && model.isVertex(parent))
				{
					cell = parent;
					parent = model.getParent(cell);
				}
				
				this.graph.selectCellForEvent(cell, me.getEvent());
			}
		}
	};

	// Returns last selected ancestor
	mxPopupMenuHandler.prototype.getCellForPopupEvent = function(me)
	{
		var cell = me.getCell();
		var model = this.graph.getModel();
		var parent = model.getParent(cell);
		
		while (model.isVertex(parent) && !this.graph.isContainer(parent))
		{
			if (this.graph.isCellSelected(parent))
			{
				cell = parent;
			}
			
			parent = model.getParent(parent);
		}
		
		return cell;
	};

})();

/**
 * Copyright (c) 2006-2017, JGraph Ltd
 * Copyright (c) 2006-2017, Gaudenz Alder
 */
(function()
{
	/**
	 * Specifies the app name. Default is document.title.
	 */
	Editor.prototype.appName = 'draw.io';

	/**
	 * Used in the GraphViewer lightbox.
	 */
	Editor.closeImage = (mxClient.IS_SVG) ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAMAAADzN3VRAAAApVBMVEUAAAD////k5OT///8AAAB1dXXMzMz9/f39/f37+/v5+fn+/v7///9iYmJaWlqFhYWnp6ejo6OHh4f////////////////7+/v5+fnx8fH///8AAAD///8bGxv7+/v5+fkoKCghISFDQ0MYGBjh4eHY2Njb29tQUFBvb29HR0c/Pz82NjYrKyu/v78SEhLu7u7s7OzV1dVVVVU7OzsVFRXAv78QEBBzqehMAAAAG3RSTlMAA/7p/vz5xZlrTiPL/v78+/v7+OXd2TYQDs8L70ZbAAABKUlEQVQoz3VS13LCMBBUXHChd8iukDslQChJ/v/TchaG4cXS+OSb1c7trU7V60OpdRz2ZtNZL4zXNlcN8BEtSG6+NxIXkeRPoBuQ1cjvZ31/VJFB10ISli6diYfH8iYO3WUNCcNlB0gTrXOtkxTo0O1aKKiBBMhhv2MNBQKoiA5wxlZo0JDzD3AYKbWacyj3fs01wxey0pyEP+R8pWKWXoqtIZ0DDg5pbki9krEKOa6LVDQsdoXEsi46Zqh69KFz7B1u7Hb2yDV8firXDKBlZ4UFiswKGRhXTS93/ECK7yxnJ3+S3y/ThpO+cfSD017nqa18aasabU0/t7d+tk0/1oMEJ1NaD67iwdF68OabFSLn+eHb0+vjy+uk8br9fdrftH0O2menfd7+AQfYM/lNjoDHAAAAAElFTkSuQmCC' : IMAGE_PATH + '/delete.png';

	/**
	 * 
	 */
	Editor.plusImage = (!mxClient.IS_SVG) ? IMAGE_PATH + '/plus.png' : 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNSBNYWNpbnRvc2giIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6MDdCMTdENjVCOEM4MTFFNDlCRjVBNDdCODU5NjNBNUMiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6MDdCMTdENjZCOEM4MTFFNDlCRjVBNDdCODU5NjNBNUMiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDowN0IxN0Q2M0I4QzgxMUU0OUJGNUE0N0I4NTk2M0E1QyIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDowN0IxN0Q2NEI4QzgxMUU0OUJGNUE0N0I4NTk2M0E1QyIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PtjrjmgAAAAtSURBVHjaYvz//z8DMigvLwcLdHZ2MiKLMzEQCaivkLGsrOw/dU0cAr4GCDAARQsQbTFrv10AAAAASUVORK5CYII=';
	
	/**
	 * 
	 */
	Editor.spinImage = (!mxClient.IS_SVG) ? IMAGE_PATH + '/spin.gif' : 'data:image/gif;base64,R0lGODlhDAAMAPUxAEVriVp7lmCAmmGBm2OCnGmHn3OPpneSqYKbr4OcsIScsI2kto6kt46lt5KnuZmtvpquvpuvv56ywaCzwqK1xKu7yay9yq+/zLHAzbfF0bjG0bzJ1LzK1MDN18jT28nT3M3X3tHa4dTc49Xd5Njf5dng5t3k6d/l6uDm6uru8e7x8/Dz9fT29/b4+Pj5+fj5+vr6+v///wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAACH5BAkKADEAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAADAAMAAAGR8CYcEgsOgYAIax4CCQuQldrCBEsiK8VS2hoFGOrlJDA+cZQwkLnqyoJFZKviSS0ICrE0ec0jDAwIiUeGyBFGhMPFBkhZo1BACH5BAkKAC4ALAAAAAAMAAwAhVB0kFR3k1V4k2CAmmWEnW6Lo3KOpXeSqH2XrIOcsISdsImhtIqhtJCmuJGnuZuwv52wwJ+ywZ+ywqm6yLHBzbLCzrXEz7fF0LnH0rrI0r7L1b/M1sXR2cfT28rV3czW3s/Z4Nfe5Nvi6ODm6uLn6+Ln7OLo7OXq7efs7+zw8u/y9PDy9PX3+Pr7+////wAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAZDQJdwSCxGDAIAoVFkFBwYSyIwGE4OkCJxIdG6WkJEx8sSKj7elfBB0a5SQg1EQ0SVVMPKhDM6iUIkRR4ZFxsgJl6JQQAh+QQJCgAxACwAAAAADAAMAIVGa4lcfZdjgpxkg51nhp5ui6N3kqh5lKqFnbGHn7KIoLOQp7iRp7mSqLmTqbqarr6br7+fssGitcOitcSuvsuuv8uwwMyzw861xNC5x9K6x9K/zNbDztjE0NnG0drJ1NzQ2eDS2+LT2+LV3ePZ4Oba4ebb4ufc4+jm6+7t8PLt8PPt8fPx8/Xx9PX09vf19/j3+Pn///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQ8CYcEgsUhQFggFSjCQmnE1jcBhqGBXiIuAQSi7FGEIgfIzCFoCXFCZiPO0hKBMiwl7ET6eUYqlWLkUnISImKC1xbUEAIfkECQoAMgAsAAAAAAwADACFTnKPT3KPVHaTYoKcb4yjcY6leZSpf5mtgZuvh5+yiqG0i6K1jqW3kae5nrHBnrLBn7LCoLPCobTDqbrIqrvIs8LOtMPPtcPPtcTPuMbRucfSvcrUvsvVwMzWxdHaydTcytXdzNbezdff0drh2ODl2+Ln3eTp4Obq4ujs5Ont5uvu6O3w6u7w6u7x7/L09vj5+vr7+vv7////AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABkdAmXBILHIcicOCUqxELKKPxKAYgiYd4oMAEWo8RVmjIMScwhmBcJMKXwLCECmMGAhPI1QRwBiaSixCMDFhLSorLi8wYYxCQQAh+QQJCgAxACwAAAAADAAMAIVZepVggJphgZtnhp5vjKN2kah3kqmBmq+KobSLorWNpLaRp7mWq7ybr7+gs8KitcSktsWnuManucexwM2ywc63xtG6yNO9ytS+ytW/zNbDz9jH0tvL1d3N197S2+LU3OPU3ePV3eTX3+Xa4efb4ufd5Onl6u7r7vHs7/Lt8PLw8/Xy9Pby9fb09ff2+Pn3+Pn6+vr///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGSMCYcEgseiwSR+RS7GA4JFGF8RiWNiEiJTERgkjFGAQh/KTCGoJwpApnBkITKrwoCFWnFlEhaAxXLC9CBwAGRS4wQgELYY1CQQAh+QQJCgAzACwAAAAADAAMAIVMcI5SdZFhgZtti6JwjaR4k6mAma6Cm6+KobSLorWLo7WNo7aPpredsMCescGitMOitcSmuMaqu8ixwc2zws63xdC4xtG5x9K9ytXAzdfCztjF0NnF0drK1d3M1t7P2N/P2eDT2+LX3+Xe5Onh5+vi5+vj6Ozk6e3n7O/o7O/q7vHs7/Lt8PPu8fPx8/X3+Pn6+vv7+/v8/Pz///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGRcCZcEgsmkIbTOZTLIlGqZNnchm2SCgiJ6IRqljFmQUiXIVnoITQde4chC9Y+LEQxmTFRkFSNFAqDAMIRQoCAAEEDmeLQQAh+QQJCgAwACwAAAAADAAMAIVXeZRefplff5lhgZtph59yjqV2kaeAmq6FnbGFnrGLorWNpLaQp7mRqLmYrb2essGgs8Klt8apusitvcquv8u2xNC7yNO8ydS8ytTAzdfBzdfM1t7N197Q2eDU3OPX3+XZ4ObZ4ebc4+jf5erg5erg5uvp7fDu8fPv8vTz9fb09vf19/j3+Pn4+fn5+vr6+/v///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGRUCYcEgspkwjEKhUVJ1QsBNp0xm2VixiSOMRvlxFGAcTJook5eEHIhQcwpWIkAFQECkNy9AQWFwyEAkPRQ4FAwQIE2llQQAh+QQJCgAvACwAAAAADAAMAIVNcY5SdZFigptph6BvjKN0kKd8lquAmq+EnbGGn7KHn7ONpLaOpbearr+csMCdscCescGhtMOnuMauvsuzws60w862xdC9ytW/y9a/zNbCztjG0drH0tvK1N3M1t7N19/U3ePb4uff5urj6Ozk6e3l6u7m6u7o7PDq7vDt8PPv8vTw8vTw8/X19vf6+vv///8AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQ8CXcEgsvlytVUplJLJIpSEDUESFTELBwSgCCQEV42kjDFiMo4uQsDB2MkLHoEHUTD7DRAHC8VAiZ0QSCgYIDxhNiUEAOw==';

	/**
	 * Used in the GraphViewer lightbox.
	 */
	Editor.tweetImage = (mxClient.IS_SVG) ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAYAAABWzo5XAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAARlJREFUeNpi/P//PwM1ABMDlQDVDGKAeo0biMXwKOMD4ilA/AiInwDxfCBWBeIgINYDmwE1yB2Ir0Alsbl6JchONPwNiC8CsTPIDJjXuIBYG4gPAnE8EDMjGaQCxGFYLOAEYlYg/o3sNSkgfo1k2ykgLgRiIyAOwOIaGE6CmwE1SA6IZ0BNR1f8GY9BXugG2UMN+YtHEzr+Aw0OFINYgHgdCYaA8HUgZkM3CASEoYb9ItKgapQkhGQQKC0dJdKQx1CLsRoEArpAvAuI3+Ix5B8Q+2AkaiyZVgGId+MwBBQhKVhzB9QgKyDuAOJ90BSLzZBzQOyCK5uxQNnXoGlJHogfIOU7UCI9C8SbgHgjEP/ElRkZB115BBBgAPbkvQ/azcC0AAAAAElFTkSuQmCC' : IMAGE_PATH + '/tweet.png';

	/**
	 * Used in the GraphViewer lightbox.
	 */
	Editor.facebookImage = (mxClient.IS_SVG) ? 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABIAAAASCAMAAABhEH5lAAAARVBMVEUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAADc6ur3AAAAFnRSTlMAYmRg2KVCC/oPq0uAcVQtHtvZuoYh/a7JUAAAAGJJREFUGNOlzkkOgCAMQNEvagvigBP3P6pRNoCJG/+myVu0RdsqxcQqQ/NFVkKQgqwDzoJ2WKajoB66atcAa0GjX0D8lJHwNGfknYJzY77LDtDZ+L74j0z26pZI2yYlMN9TL17xEd+fl1D+AAAAAElFTkSuQmCC' : IMAGE_PATH + '/facebook.png';

	/**
	 * Blank 1x1 pixel transparent PNG image.
	 */
	Editor.blankImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACklEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==';
	
	/**
	 * Contains the default XML for an empty diagram.
	 */
	Editor.defaultCsvValue = '##\n' +
		'## Example CSV import. Use ## for comments and # for configuration. Paste CSV below.\n' +
		'## The following names are reserved and should not be used (or ignored):\n' +
		'## id, tooltip, placeholder(s), link and label (see below)\n' +
		'##\n' +
		'#\n' +
		'## Node label with placeholders and HTML.\n' +
		'## Default is \'%name_of_first_column%\'.\n' +
		'#\n' +
		'# label: %name%<br><i style="color:gray;">%position%</i><br><a href="mailto:%email%">Email</a>\n' +
		'#\n' +
		'## Node style (placeholders are replaced once).\n' +
		'## Default is the current style for nodes.\n' +
		'#\n' +
		'# style: label;image=%image%;whiteSpace=wrap;html=1;rounded=1;fillColor=%fill%;strokeColor=%stroke%;\n' +
		'#\n' +
		'## Connections between rows ("from": source colum, "to": target column).\n' +
		'## Label, style and invert are optional. Defaults are \'\', current style and false.\n' +
		'## The target column may contain a comma-separated list of values.\n' +
		'## Multiple connect entries are allowed.\n' +
		'#\n' +
		'# connect: {"from": "manager", "to": "name", "invert": true, "label": "manages", \\\n' +
		'#          "style": "curved=1;endArrow=blockThin;endFill=1;fontSize=11;"}\n' +
		'# connect: {"from": "refs", "to": "id", "style": "curved=1;fontSize=11;"}\n' +
		'#\n' +
		'## Node width. Possible value are px or auto. Default is auto.\n' +
		'#\n' +
		'# width: auto\n' +
		'#\n' +
		'## Node height. Possible value are px or auto. Default is auto.\n' +
		'#\n' +
		'# height: auto\n' +
		'#\n' +
		'## Padding for autosize. Default is 0.\n' +
		'#\n' +
		'# padding: -26\n' +
		'#\n' +
		'## Comma-separated list of ignored columns for metadata. (These can be\n' +
		'## used for connections and styles but will not be added as metadata.)\n' +
		'#\n' +
		'# ignore: id,image,fill,stroke\n' +
		'#\n' +
		'## Column to be renamed to link attribute (used as link).\n' +
		'#\n' +
		'# link: url\n' +
		'#\n' +
		'## Spacing between nodes. Default is 40.\n' +
		'#\n' +
		'# nodespacing: 40\n' +
		'#\n' +
		'## Spacing between parallel edges. Default is 40.\n' +
		'#\n' +
		'# edgespacing: 40\n' +
		'#\n' +
		'## Name of layout. Possible values are auto, none, verticaltree, horizontaltree,\n' +
		'## verticalflow, horizontalflow, organic, circle. Default is auto.\n' +
		'#\n' +
		'# layout: auto\n' +
		'#\n' +
		'## ---- CSV below this line. First line are column names. ----\n' +
		'name,position,id,location,manager,email,fill,stroke,refs,url,image\n' +
		'Evan Miller,CFO,emi,Office 1,,me@example.com,#dae8fc,#6c8ebf,,https://www.draw.io,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-9-2-128.png\n' +
		'Edward Morrison,Brand Manager,emo,Office 2,Evan Miller,me@example.com,#d5e8d4,#82b366,,https://www.draw.io,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-10-3-128.png\n' +
		'Ron Donovan,System Admin,rdo,Office 3,Evan Miller,me@example.com,#d5e8d4,#82b366,"emo,tva",https://www.draw.io,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-2-128.png\n' +
		'Tessa Valet,HR Director,tva,Office 4,Evan Miller,me@example.com,#d5e8d4,#82b366,,https://www.draw.io,https://cdn3.iconfinder.com/data/icons/user-avatars-1/512/users-3-128.png\n';

	/**
	 * Executes the first step for connecting to Google Drive.
	 */
	Editor.prototype.editButtonLink = (urlParams['edit'] != null) ? decodeURIComponent(urlParams['edit']) : null;

	/**
	 * 
	 */
	if (urlParams['dev'] == '1')
	{
		Editor.prototype.editBlankUrl = Editor.prototype.editBlankUrl + '&dev=1';
		Editor.prototype.editBlankFallbackUrl = Editor.prototype.editBlankFallbackUrl + '&dev=1';
	}

	/**
	 * Adds support for old stylesheets and compressed files
	 */
	var editorSetGraphXml = Editor.prototype.setGraphXml;
	Editor.prototype.setGraphXml = function(node)
	{
		node = (node != null && node.nodeName != 'mxlibrary') ? this.extractGraphModel(node) : null;

		if (node != null)
		{
			// Checks input for parser errors
			var errs = node.getElementsByTagName('parsererror');
			
			if (errs != null && errs.length > 0)
			{
				var elt = errs[0];
				var divs = elt.getElementsByTagName('div');
				
				if (divs != null && divs.length > 0)
				{
					elt = divs[0];
				}
				
				throw {message: mxUtils.getTextContent(elt)};
			}
			else if (node.nodeName == 'mxGraphModel')
			{
				var style = node.getAttribute('style') || 'default-style2';
				
				// Decodes the style if required
				if (urlParams['embed'] != '1' && (style == null || style == ''))
				{
					var node2 = (this.graph.themes != null) ?
						this.graph.themes['default-old'] :
						mxUtils.load(STYLE_PATH + '/default-old.xml').getDocumentElement();
				    
				    if (node2 != null)
				    {
				    	var dec2 = new mxCodec(node2.ownerDocument);
				    	dec2.decode(node2, this.graph.getStylesheet());
				    }
				}
				else if (style != this.graph.currentStyle)
				{
				    var node2 = (this.graph.themes != null) ?
						this.graph.themes[style] :
						mxUtils.load(STYLE_PATH + '/' + style + '.xml').getDocumentElement()
				    
				    if (node2 != null)
				    {
				    	var dec2 = new mxCodec(node2.ownerDocument);
				    	dec2.decode(node2, this.graph.getStylesheet());
				    }
				}
	
				this.graph.currentStyle = style;
				this.graph.mathEnabled = (urlParams['math'] == '1' || node.getAttribute('math') == '1');
				
				var bgImg = node.getAttribute('backgroundImage');
				
				if (bgImg != null)
				{
					bgImg = JSON.parse(bgImg);
					this.graph.setBackgroundImage(new mxImage(bgImg.src, bgImg.width, bgImg.height));
				}
				else
				{
					this.graph.setBackgroundImage(null);
				}
				
				mxClient.NO_FO = (this.graph.mathEnabled) ? true : this.originalNoForeignObject;
				this.graph.setShadowVisible(node.getAttribute('shadow') == '1', false);
			}
	
			// Calls updateGraphComponents
			editorSetGraphXml.apply(this, arguments);
		}
		else
		{
			throw { 
			    message: mxResources.get('notADiagramFile') || 'Invalid data',
			    toString: function() { return this.message; }
			};
		}
	};

	/**
	 * Adds persistent style to file
	 */
	var editorGetGraphXml = Editor.prototype.getGraphXml;	
	Editor.prototype.getGraphXml = function(ignoreSelection)
	{
		ignoreSelection = (ignoreSelection != null) ? ignoreSelection : true;
		var node = editorGetGraphXml.apply(this, arguments);
		
		// Adds the current style
		if (this.graph.currentStyle != null && this.graph.currentStyle != 'default-style2')
		{
			node.setAttribute('style', this.graph.currentStyle);
		}
		
		// Adds the background image
		if (this.graph.backgroundImage != null)
		{
			node.setAttribute('backgroundImage', JSON.stringify(this.graph.backgroundImage));
		}
		
		node.setAttribute('math', (this.graph.mathEnabled) ? '1' : '0');
		node.setAttribute('shadow', (this.graph.shadowVisible) ? '1' : '0');
		
		return node;
	};
	
	/**
	 * Helper function to extract the graph model XML node.
	 */
	Editor.prototype.isDataSvg = function(svg)
	{
		try
		{
			var svgRoot = mxUtils.parseXml(svg).documentElement;
			var tmp = svgRoot.getAttribute('content');
			
			if (tmp != null)
			{
				if (tmp != null && tmp.charAt(0) != '<' && tmp.charAt(0) != '%')
				{
					tmp = unescape((window.atob) ? atob(tmp) : Base64.decode(cont, tmp));
				}
				
				if (tmp != null && tmp.charAt(0) == '%')
				{
					tmp = decodeURIComponent(tmp);
				}
				
				if (tmp != null && tmp.length > 0)
				{
					var node = mxUtils.parseXml(tmp).documentElement;
					
					
					return node.nodeName == 'mxfile' || node.nodeName == 'mxGraphModel';
				}
			}
		}
		catch (e)
		{
			// ignore
		}
		
		return false;
	};
	
	/**
	 * Helper function to extract the graph model XML node.
	 */
	Editor.prototype.extractGraphModel = function(node, allowMxFile)
	{
		if (node != null && typeof(pako) !== 'undefined')
		{
			var tmp = node.ownerDocument.getElementsByTagName('div');
			var divs = [];
			
			if (tmp != null && tmp.length > 0)
			{
				for (var i = 0; i < tmp.length; i++)
				{
					if (tmp[i].getAttribute('class') == 'mxgraph')
					{
						divs.push(tmp[i]);
						break;
					}	
				}
			}
			
			if (divs.length > 0)
			{
				var data = divs[0].getAttribute('data-mxgraph');

				if (data != null)
				{
					var config = JSON.parse(data);

					if (config != null && config.xml != null)
					{
						var doc2 = mxUtils.parseXml(config.xml);
						node = doc2.documentElement;
					}
				}
				else
				{
					var divs2 = divs[0].getElementsByTagName('div');
					
					if (divs2.length > 0)
					{
						var data = mxUtils.getTextContent(divs2[0]);
		        		data = this.graph.decompress(data);
		        		
		        		if (data.length > 0)
		        		{
		        			var doc2 = mxUtils.parseXml(data);
		        			node = doc2.documentElement;
		        		}
					}
				}
			}
		}
		
		if (node != null && node.nodeName == 'svg')
		{
			var tmp = node.getAttribute('content');
			
			if (tmp != null && tmp.charAt(0) != '<' && tmp.charAt(0) != '%')
			{
				tmp = unescape((window.atob) ? atob(tmp) : Base64.decode(cont, tmp));
			}
			
			if (tmp != null && tmp.charAt(0) == '%')
			{
				tmp = decodeURIComponent(tmp);
			}
			
			if (tmp != null && tmp.length > 0)
			{
				node = mxUtils.parseXml(tmp).documentElement;
			}
			else
			{
				throw {message: mxResources.get('notADiagramFile')};
			}
		}
		
		if (node != null && !allowMxFile)
		{
			var diagramNode = null;
			
			if (node.nodeName == 'diagram')
			{
				diagramNode = node;
			}
			else if (node.nodeName == 'mxfile')
			{
				var diagrams = node.getElementsByTagName('diagram');

				if (diagrams.length > 0)
				{
					diagramNode = diagrams[Math.max(0, Math.min(diagrams.length - 1, urlParams['page'] || 0))];
				}
			}
			
			if (diagramNode != null)
			{
				var tmp = this.graph.decompress(mxUtils.getTextContent(diagramNode));
				
				if (tmp != null && tmp.length > 0)
				{
					node = mxUtils.parseXml(tmp).documentElement;
				}
			}
		}
		
		if (node != null && node.nodeName != 'mxGraphModel' && (!allowMxFile || node.nodeName != 'mxfile'))
		{
			node = null;
		}
		
		return node;
	};
	
	/**
	 * Overrides reset graph.
	 */
	var editorResetGraph = Editor.prototype.resetGraph;	
	Editor.prototype.resetGraph = function()
	{
		this.graph.mathEnabled = (urlParams['math'] == '1');
		this.graph.view.x0 = null;
		this.graph.view.y0 = null;
		mxClient.NO_FO = (this.graph.mathEnabled) ? true : this.originalNoForeignObject;
		editorResetGraph.apply(this, arguments);
	};

	/**
	 * Math support.
	 */
	Editor.prototype.originalNoForeignObject = mxClient.NO_FO;

	var editorUpdateGraphComponents = Editor.prototype.updateGraphComponents;
	Editor.prototype.updateGraphComponents = function()
	{
		editorUpdateGraphComponents.apply(this, arguments);
		mxClient.NO_FO = (this.graph.mathEnabled && Editor.MathJaxRender != null) ? true : this.originalNoForeignObject;
	};
		
	/**
	 * Initializes math typesetting and loads respective code.
	 */
	Editor.initMath = function(src, config)
	{
		src = (src != null) ? src : 'https://cdnjs.cloudflare.com/ajax/libs/mathjax/2.7.0/MathJax.js?config=TeX-MML-AM_HTMLorMML';
		Editor.mathJaxQueue = [];
		
		Editor.doMathJaxRender = function(container)
		{
			MathJax.Hub.Queue(['Typeset', MathJax.Hub, container]);
		};

		// Disables global typesetting and messages on startup, adds queue for
		// asynchronous rendering while MathJax is loading
		window.MathJax =
		{
			skipStartupTypeset: true,
			showMathMenu: false,
			messageStyle: 'none',
			AuthorInit: function ()
			{
				// Specification recommends using SVG over HTML-CSS if browser is known
				// Check if too inconsistent with image export and print output
				MathJax.Hub.Config(config || {
					jax: ['input/TeX', 'input/MathML', 'input/AsciiMath', 'output/HTML-CSS'],
					extensions: ['tex2jax.js', 'mml2jax.js', 'asciimath2jax.js'],
					TeX: {
					  extensions: ['AMSmath.js', 'AMSsymbols.js', 'noErrors.js', 'noUndefined.js']
					},
					// Ignores math in in-place editor
					tex2jax: {
						ignoreClass: 'mxCellEditor'
				  	},
				  	asciimath2jax: {
						ignoreClass: 'mxCellEditor'
				  	}
				});
				MathJax.Hub.Register.StartupHook('Begin', function()
				{
					for (var i = 0; i < Editor.mathJaxQueue.length; i++)
					{
						Editor.doMathJaxRender(Editor.mathJaxQueue[i]);
					}
				});
		    }
		};

		// Adds global enqueue method for async rendering
		Editor.MathJaxRender = function(container)
		{
			// Initial rendering when MathJax finished loading
			if (typeof(MathJax) !== 'undefined' && typeof(MathJax.Hub) !== 'undefined')
			{
				Editor.doMathJaxRender(container);
			}
			else
			{
				Editor.mathJaxQueue.push(container);
			}
		};

		// Adds global clear queue method
		Editor.MathJaxClear = function()
		{
			Editor.mathJaxQueue = [];
		};
		
		// Updates typeset after changes
		var editorInit = Editor.prototype.init;
		
		Editor.prototype.init = function()
		{
			this.graph.addListener(mxEvent.SIZE, mxUtils.bind(this, function(sender, evt)
			{
				if (this.graph.mathEnabled)
				{
					Editor.MathJaxRender(this.graph.container);
				}
			}));
		};
		
		var tags = document.getElementsByTagName('script');
		
		if (tags != null && tags.length > 0)
		{
			var script = document.createElement('script');
			script.type = 'text/javascript';
			script.src = src;
			tags[0].parentNode.appendChild(script);
		}
	};

	/**
	 * Return array of string values, or NULL if CSV string not well formed.
	 */
	Editor.prototype.csvToArray = function(text)
	{
	    var re_valid = /^\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*(?:,\s*(?:'[^'\\]*(?:\\[\S\s][^'\\]*)*'|"[^"\\]*(?:\\[\S\s][^"\\]*)*"|[^,'"\s\\]*(?:\s+[^,'"\s\\]+)*)\s*)*$/;
	    var re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
	    // Return NULL if input string is not well formed CSV string.
	    if (!re_valid.test(text)) return null;
	    var a = [];                     // Initialize array to receive values.
	    text.replace(re_value, // "Walk" the string using replace with callback.
	        function(m0, m1, m2, m3) {
	            // Remove backslash from \' in single quoted values.
	            if      (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
	            // Remove backslash from \" in double quoted values.
	            else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
	            else if (m3 !== undefined) a.push(m3);
	            return ''; // Return empty string.
	        });
	    // Handle special case of empty last value.
	    if (/,\s*$/.test(text)) a.push('');
	    return a;
	};

	/**
	 * Adds persistence for recent colors
	 */
	if (window.ColorDialog)
	{
		var colorDialogAddRecentColor = ColorDialog.addRecentColor;
		
		ColorDialog.addRecentColor = function(color, max)
		{
			colorDialogAddRecentColor.apply(this, arguments);
			
			mxSettings.setRecentColors(ColorDialog.recentColors);
			mxSettings.save();
		};
		
		var colorDialogResetRecentColors = ColorDialog.resetRecentColors;
		
		ColorDialog.resetRecentColors = function()
		{
			colorDialogResetRecentColors.apply(this, arguments);
			
			mxSettings.setRecentColors(ColorDialog.recentColors);
			mxSettings.save();
		};
	}

	// Overridden to add edit shape option
	if (window.StyleFormatPanel != null)
	{
		var formatInit = Format.prototype.init;
		
		Format.prototype.init = function()
		{
			formatInit.apply(this, arguments);

			var ui = this.editorUi;
			ui.editor.addListener('fileLoaded', this.update);
		};

		var formatRefresh = Format.prototype.refresh;
		
		Format.prototype.refresh = function()
		{
			var ui = this.editorUi;
			
			if (ui.getCurrentFile() != null || urlParams['embed'] == '1')
			{
				formatRefresh.apply(this, arguments);
			}
			else
			{
				this.clear();
			}
		};
		
		/**
		 * Adds autosave and math typesetting options.
		 */
		var diagramFormatPanelAddOptions = DiagramFormatPanel.prototype.addOptions;
		DiagramFormatPanel.prototype.addOptions = function(div)
		{
			div = diagramFormatPanelAddOptions.apply(this, arguments);
			
			var ui = this.editorUi;
			var editor = ui.editor;
			var graph = editor.graph;
			
			if (graph.isEnabled())
			{
				var file = ui.getCurrentFile();
	
				if (file != null && file.isAutosaveOptional())
				{
					var opt = this.createOption(mxResources.get('autosave'), function()
					{
						return ui.editor.autosave;
					}, function(checked)
					{
						ui.editor.setAutosave(checked);
					},
					{
						install: function(apply)
						{
							this.listener = function()
							{
								apply(ui.editor.autosave);
							};
							
							ui.editor.addListener('autosaveChanged', this.listener);
						},
						destroy: function()
						{
							ui.editor.removeListener(this.listener);
						}
					});
					
					div.appendChild(opt);
				}
			}

			return div;
		};

		/**
		 * Adds predefiend styles.
		 */
		var StyleFormatPanelInit = StyleFormatPanel.prototype.init;
		StyleFormatPanel.prototype.init = function()
		{
			// TODO: Update sstate in Format
			var sstate = this.format.createSelectionState();

			if (sstate.style.shape != 'image')
			{
				this.container.appendChild(this.addStyles(this.createPanel()));
			}
			
			StyleFormatPanelInit.apply(this, arguments);
		};

		/**
		 * Overridden to add copy and paste style.
		 */
		var styleFormatPanelAddStyleOps = StyleFormatPanel.prototype.addStyleOps;
		StyleFormatPanel.prototype.addStyleOps = function(div)
		{
			var btn = mxUtils.button(mxResources.get('copyStyle'), mxUtils.bind(this, function(evt)
			{
				this.editorUi.actions.get('copyStyle').funct();
			}));
			
			btn.setAttribute('title', mxResources.get('copyStyle') + ' (' + this.editorUi.actions.get('copyStyle').shortcut + ')');
			btn.style.marginBottom = '2px';
			btn.style.width = '100px';
			btn.style.marginRight = '2px';
			
			div.appendChild(btn);
			
			var btn = mxUtils.button(mxResources.get('pasteStyle'), mxUtils.bind(this, function(evt)
			{
				this.editorUi.actions.get('pasteStyle').funct();
			}));
			
			btn.setAttribute('title', mxResources.get('pasteStyle') + ' (' + this.editorUi.actions.get('pasteStyle').shortcut + ')');
			btn.style.marginBottom = '2px';
			btn.style.width = '100px';
			
			div.appendChild(btn);
			mxUtils.br(div);
			
			return styleFormatPanelAddStyleOps.apply(this, arguments);
		};

		/**
		 * Creates the buttons for the predefined styles.
		 */
		StyleFormatPanel.prototype.addStyles = function(div)
		{
			var graph = this.editorUi.editor.graph;
			var picker = document.createElement('div');
			picker.style.whiteSpace = 'normal';
			picker.style.paddingLeft = '24px';
			picker.style.paddingRight = '20px';
			div.style.paddingLeft = '16px';
			div.style.paddingBottom = '6px';
			div.style.position = 'relative';
			div.appendChild(picker);

			var stylenames = ['plain-gray', 'plain-blue', 'plain-green', 'plain-turquoise',
				'plain-orange', 'plain-yellow', 'plain-red', 'plain-pink', 'plain-purple', 'gray',
				'blue', 'green', 'turquoise', 'orange', 'yellow', 'red', 'pink', 'purple'];

			function updateScheme(colorsets)
			{
				function addButton(colorset)
				{
					var btn = mxUtils.button('', function(evt)
					{
						graph.getModel().beginUpdate();
						try
						{
							var cells = graph.getSelectionCells();
							
							for (var i = 0; i < cells.length; i++)
							{
								var style = graph.getModel().getStyle(cells[i]);
				
								for (var j = 0; j < stylenames.length; j++)
								{
									style = mxUtils.removeStylename(style, stylenames[j]);
								}
								
								if (colorset != null)
								{
									style = mxUtils.setStyle(style, mxConstants.STYLE_FILLCOLOR, colorset['fill']);
									style = mxUtils.setStyle(style, mxConstants.STYLE_STROKECOLOR, colorset['stroke']);
									style = mxUtils.setStyle(style, mxConstants.STYLE_GRADIENTCOLOR, colorset['gradient']);
								}
								else
								{
									style = mxUtils.setStyle(style, mxConstants.STYLE_FILLCOLOR, '#ffffff');
									style = mxUtils.setStyle(style, mxConstants.STYLE_STROKECOLOR, '#000000');
									style = mxUtils.setStyle(style, mxConstants.STYLE_GRADIENTCOLOR, null);
								}
								
								graph.getModel().setStyle(cells[i], style);
							}
						}
						finally
						{
							graph.getModel().endUpdate();
						}
					})
	
					btn.style.width = '36px';
					btn.style.height = '30px';
					btn.style.margin = '0px 6px 6px 0px';
					
					if (colorset != null)
					{
						if (colorset['gradient'] != null)
						{
							if (mxClient.IS_IE && (mxClient.IS_QUIRKS || document.documentMode < 10))
							{
						    	btn.style.filter = 'progid:DXImageTransform.Microsoft.Gradient('+
				                	'StartColorStr=\'' + colorset['fill'] +
				                	'\', EndColorStr=\'' + colorset['gradient'] + '\', GradientType=0)';
							}
							else
							{
								btn.style.backgroundImage = 'linear-gradient(' + colorset['fill'] + ' 0px,' +
									colorset['gradient'] + ' 100%)';
							}
						}
						else
						{					
							btn.style.backgroundColor = colorset['fill'];
						}
						
						btn.style.border = '1px solid ' + colorset['stroke'];
					}
					else
					{
						btn.style.backgroundColor = '#ffffff';
						btn.style.border = '1px solid #000000';
					}
					
					picker.appendChild(btn);
				};
				
				picker.innerHTML = '';
				
				for (var i = 0; i < colorsets.length; i++)
				{
					if (i > 0 && mxUtils.mod(i, 4) == 0)
					{
						mxUtils.br(picker);
					}
					
					addButton(colorsets[i]);
				}
			};

			if (this.editorUi.currentScheme == null)
			{
				this.editorUi.currentScheme = 0;
			}

			var schemes = [[null, {fill: '#f5f5f5', stroke: '#666666'},
				{fill: '#dae8fc', stroke: '#6c8ebf'}, {fill: '#d5e8d4', stroke: '#82b366'},
				{fill: '#ffe6cc', stroke: '#d79b00'}, {fill: '#fff2cc', stroke: '#d6b656'},
				{fill: '#f8cecc', stroke: '#b85450'}, {fill: '#e1d5e7', stroke: '#9673a6'}],
			    [null,
				{fill: '#f5f5f5', stroke: '#666666', gradient: '#b3b3b3'},
				{fill: '#dae8fc', stroke: '#6c8ebf', gradient: '#7ea6e0'},
				{fill: '#d5e8d4', stroke: '#82b366', gradient: '#97d077'},
				{fill: '#ffcd28', stroke: '#d79b00', gradient: '#ffa500'},
				{fill: '#fff2cc', stroke: '#d6b656', gradient: '#ffd966'},
				{fill: '#f8cecc', stroke: '#b85450', gradient: '#ea6b66'},
				{fill: '#e6d0de', stroke: '#996185', gradient: '#d5739d'}],
				[null, {fill: '#eeeeee', stroke: '#36393d'},
				{fill: '#f9f7ed', stroke: '#36393d'}, {fill: '#ffcc99', stroke: '#36393d'},
				{fill: '#cce5ff', stroke: '#36393d'}, {fill: '#ffff88', stroke: '#36393d'},
				{fill: '#cdeb8b', stroke: '#36393d'}, {fill: '#ffcccc', stroke: '#36393d'}]];
			
			var left = document.createElement('div');
			left.style.cssText = 'position:absolute;left:10px;top:8px;bottom:8px;width:20px;margin:4px;opacity:0.5;' +
				'background-repeat:no-repeat;background-position:center center;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQBAMAAADQT4M0AAAAIVBMVEUAAAB2dnZ4eHh3d3d1dXVxcXF2dnZ2dnZ2dnZxcXF2dnYmb3w1AAAACnRSTlMAfCTkhhvb7cQSPH2JPgAAADRJREFUCNdjwACMAmBKaiGYs2oJmLPKAZ3DabU8AMRTXpUKopislqFyVzCAuUZgikkBZjoAcMYLnp53P/UAAAAASUVORK5CYII=);';
			div.appendChild(left);
			
			mxEvent.addListener(left, 'click', mxUtils.bind(this, function()
			{
				this.editorUi.currentScheme = mxUtils.mod(this.editorUi.currentScheme - 1, schemes.length);
				updateScheme(schemes[this.editorUi.currentScheme]);
			}));
			
			var right = document.createElement('div');
			right.style.cssText = 'position:absolute;left:202px;top:8px;bottom:8px;width:20px;margin:4px;opacity:0.5;' +
				'background-repeat:no-repeat;background-position:center center;background-image:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAQBAMAAADQT4M0AAAAIVBMVEUAAAB2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnZ2dnYBuwCcAAAACnRSTlMAfCTkhhvb7cQSPH2JPgAAADZJREFUCNdjQAOMAmBKaiGY8loF5rKswsZlrVo8AUiFrTICcbIWK8A5DF1gDoMymMPApIAwHwCS0Qx/U7qCBQAAAABJRU5ErkJggg==);';
			div.appendChild(right);
			
			mxEvent.addListener(right, 'click', mxUtils.bind(this, function()
			{
				this.editorUi.currentScheme = mxUtils.mod(this.editorUi.currentScheme + 1, schemes.length);
				updateScheme(schemes[this.editorUi.currentScheme]);
			}));
			
			// Hover state
			function addHoverState(elt)
			{
				mxEvent.addListener(elt, 'mouseenter', function()
				{
					elt.style.opacity = '1';
				});
				mxEvent.addListener(elt, 'mouseleave', function()
				{
					elt.style.opacity = '0.5';
				});
			};
			
			addHoverState(left);
			addHoverState(right);
			
			updateScheme(schemes[this.editorUi.currentScheme]);
			
			return div;
		};
		
		StyleFormatPanel.prototype.addEditOps = function(div)
		{
			var ss = this.format.getSelectionState();
			var btn = null;
			
			if (this.editorUi.editor.graph.getSelectionCount() == 1)
			{
				btn = mxUtils.button(mxResources.get('editStyle'), mxUtils.bind(this, function(evt)
				{
					this.editorUi.actions.get('editStyle').funct();
				}));
				
				btn.setAttribute('title', mxResources.get('editStyle') + ' (' + this.editorUi.actions.get('editStyle').shortcut + ')');
				btn.style.width = '202px';
				btn.style.marginBottom = '2px';
				
				div.appendChild(btn);
			}
			
			var graph = this.editorUi.editor.graph;
			var state = graph.view.getState(graph.getSelectionCell());
			
			if (graph.getSelectionCount() == 1 && state != null && state.shape != null && state.shape.stencil != null)
			{
				var btn2 = mxUtils.button(mxResources.get('editShape'), mxUtils.bind(this, function(evt)
				{
					this.editorUi.actions.get('editShape').funct();
				}));
				
				btn2.setAttribute('title', mxResources.get('editShape'));
				btn2.style.marginBottom = '2px';
				
				if (btn == null)
				{
					btn2.style.width = '202px';
				}
				else
				{
					btn.style.width = '100px';
					btn2.style.width = '100px';
					btn2.style.marginLeft = '2px';
				}
				
				div.appendChild(btn2);
			}
			else if (ss.image)
			{
				var btn2 = mxUtils.button(mxResources.get('editImage'), mxUtils.bind(this, function(evt)
				{
					this.editorUi.actions.get('image').funct();
				}));
				
				btn2.setAttribute('title', mxResources.get('editImage'));
				btn2.style.marginBottom = '2px';
				
				if (btn == null)
				{
					btn2.style.width = '202px';
				}
				else
				{
					btn.style.width = '100px';
					btn2.style.width = '100px';
					btn2.style.marginLeft = '2px';
				}
				
				div.appendChild(btn2);
			}
			
			return div;
		};
	}

	/**
	 * Changes the default stylename so that it matches the old named style
	 * if one was specified in the XML.
	 */
	Graph.prototype.defaultThemeName = 'default-style2';
	
	/**
	 * Contains the last XML that was pasted.
	 */
	Graph.prototype.lastPasteXml = null;
	
	/**
	 * Contains the number of times the last XML was pasted.
	 */
	Graph.prototype.pasteCounter = 0;
	
	/**
	 * Graph Overrides
	 */
	Graph.prototype.defaultScrollbars = urlParams['sb'] != '0';

	/**
	 * Specifies if the page should be visible for new files. Default is true.
	 */
	Graph.prototype.defaultPageVisible = urlParams['pv'] != '0';

	/**
	 * Specifies if the page should be visible for new files. Default is true.
	 */
	Graph.prototype.shadowId = 'dropShadow';

	/**
	 * Enables move of bends/segments without selecting.
	 */
	Graph.prototype.edgeMode = urlParams['edge'] != 'move';
		
	/**
	 * Adds rack child layout style.
	 */
	var graphInit = Graph.prototype.init;
	Graph.prototype.init = function()
	{
		graphInit.apply(this, arguments);

		// Override insert location for current mouse point
		var mouseEvent = null;
		
		function setMouseEvent(evt)
		{
			mouseEvent = evt;
			
			// Workaround for member not found in IE8-
			if (mxClient.IS_QUIRKS || document.documentMode == 7 || document.documentMode == 8)
			{
				mouseEvent = mxUtils.clone(evt);
			}
		};
		
		mxEvent.addListener(this.container, 'mouseenter', setMouseEvent);
		mxEvent.addListener(this.container, 'mousemove', setMouseEvent);
		
		mxEvent.addListener(this.container, 'mouseleave', function(evt)
		{
			mouseEvent = null;
		});
				
		// Extends getInsertPoint to use the current mouse location
		this.isMouseInsertPoint = function()
		{
			return mouseEvent != null;
		};
		
		var getInsertPoint = this.getInsertPoint;
		
		this.getInsertPoint = function()
		{
			if (mouseEvent != null)
			{
				return this.getPointForEvent(mouseEvent);
			}
			
			return getInsertPoint.apply(this, arguments);
		};
		
		var layoutManagerGetLayout = this.layoutManager.getLayout;
		
		this.layoutManager.getLayout = function(cell)
		{
			var state = this.graph.view.getState(cell);
			var style = (state != null) ? state.style : this.graph.getCellStyle(cell);
			
			// mxRackContainer may be undefined as it is dynamically loaded at render time
			if (typeof(mxRackContainer) != 'undefined' && style['childLayout'] == 'rack')
			{
				var rackLayout = new mxStackLayout(this.graph, false);
				
				rackLayout.setChildGeometry = function(child, geo)
				{
					var unitSize = 20;
					geo.height = Math.max(geo.height, unitSize);
					
					if (geo.height / unitSize > 1)
					{
						var mod = geo.height % unitSize;
						geo.height += mod > unitSize / 2 ? (unitSize - mod) : -mod;
					}
			
					this.graph.getModel().setGeometry(child, geo);
				};
			
				rackLayout.fill = true;
				rackLayout.unitSize = mxRackContainer.unitSize | 20;
				rackLayout.marginLeft = style['marginLeft'] || 0;
				rackLayout.marginRight = style['marginRight'] || 0;
				rackLayout.marginTop = style['marginTop'] || 0;
				rackLayout.marginBottom = style['marginBottom'] || 0;
				rackLayout.resizeParent = false;
				
				return rackLayout;
			}
			
			return layoutManagerGetLayout.apply(this, arguments);
		}
	};

	/**
	 * Sets default style (used in editor.get/setGraphXml below)
	 */
	var graphLoadStylesheet = Graph.prototype.loadStylesheet;
	Graph.prototype.loadStylesheet = function()
	{
		graphLoadStylesheet.apply(this, arguments);
		this.currentStyle = 'default-style2';
	};

	/**
	 * Adds a shadow filter to the given svg root.
	 */
	Graph.prototype.addSvgShadow = function(svgRoot, group, createOnly)
	{
		createOnly = (createOnly != null) ? createOnly : false;
		
		var svgDoc = svgRoot.ownerDocument;
		
		var filter = (svgDoc.createElementNS != null) ?
			svgDoc.createElementNS(mxConstants.NS_SVG, 'filter') : svgDoc.createElement('filter');
		filter.setAttribute('id', this.shadowId);

		var blur = (svgDoc.createElementNS != null) ?
				svgDoc.createElementNS(mxConstants.NS_SVG, 'feGaussianBlur') : svgDoc.createElement('feGaussianBlur');
		blur.setAttribute('in', 'SourceAlpha');
		blur.setAttribute('stdDeviation', '1.7');
		blur.setAttribute('result', 'blur');
		filter.appendChild(blur);
		
		var offset = (svgDoc.createElementNS != null) ?
				svgDoc.createElementNS(mxConstants.NS_SVG, 'feOffset') : svgDoc.createElement('feOffset');
		offset.setAttribute('in', 'blur');
		offset.setAttribute('dx', '3');
		offset.setAttribute('dy', '3');
		offset.setAttribute('result', 'offsetBlur');
		filter.appendChild(offset);
		
		var flood = (svgDoc.createElementNS != null) ?
				svgDoc.createElementNS(mxConstants.NS_SVG, 'feFlood') : svgDoc.createElement('feFlood');
		flood.setAttribute('flood-color', '#3D4574');
		flood.setAttribute('flood-opacity', '0.4');
		flood.setAttribute('result', 'offsetColor');
		filter.appendChild(flood);
		
		var composite = (svgDoc.createElementNS != null) ?
				svgDoc.createElementNS(mxConstants.NS_SVG, 'feComposite') : svgDoc.createElement('feComposite');
		composite.setAttribute('in', 'offsetColor');
		composite.setAttribute('in2', 'offsetBlur');
		composite.setAttribute('operator', 'in');
		composite.setAttribute('result', 'offsetBlur');
		filter.appendChild(composite);

		var feBlend = (svgDoc.createElementNS != null) ?
				svgDoc.createElementNS(mxConstants.NS_SVG, 'feBlend') : svgDoc.createElement('feBlend');
		feBlend.setAttribute('in', 'SourceGraphic');
		feBlend.setAttribute('in2', 'offsetBlur');
		filter.appendChild(feBlend);
		
		// Creates defs element if not available
		var defs = svgRoot.getElementsByTagName('defs');
		var defsElt = null;
		
		if (defs.length == 0)
		{
			defsElt = (svgDoc.createElementNS != null) ?
				svgDoc.createElementNS(mxConstants.NS_SVG, 'defs') : svgDoc.createElement('defs');
			
			if (svgRoot.firstChild != null)
			{
				svgRoot.insertBefore(defsElt, svgRoot.firstChild);
			}
			else
			{
				svgRoot.appendChild(defsElt);
			}
		}
		else
		{
			defsElt = defs[0];
		}
		
		defsElt.appendChild(filter);
		
		if (!createOnly)
		{
			(group || svgRoot.getElementsByTagName('g')[0]).setAttribute('filter', 'url(#' + this.shadowId + ')');
			
			if (!isNaN(parseInt(svgRoot.getAttribute('width'))))
			{
				svgRoot.setAttribute('width', parseInt(svgRoot.getAttribute('width')) + 6);
				svgRoot.setAttribute('height', parseInt(svgRoot.getAttribute('height')) + 6);
			}
		}
		
		return filter;
	};
	
	/**
	 * Loads the stylesheet for this graph.
	 */
	Graph.prototype.setShadowVisible = function(value, fireEvent)
	{
		if (mxClient.IS_SVG)
		{
			fireEvent = (fireEvent != null) ? fireEvent : true;
			this.shadowVisible = value;
			
			if (this.shadowVisible)
			{
				this.view.getDrawPane().setAttribute('filter', 'url(#' + this.shadowId + ')');
			}
			else
			{
				this.view.getDrawPane().removeAttribute('filter');
			}
			
			if (fireEvent)
			{
				this.fireEvent(new mxEventObject('shadowVisibleChanged'));
			}
		}
	};
	
	/**
	 * Selects first unlocked layer if one exists
	 */
	Graph.prototype.selectUnlockedLayer = function()
	{
		if (this.defaultParent == null)
		{
			var childCount = this.model.getChildCount(this.model.root);
			var cell = null;
			var index = 0;
			
			do
			{
				cell = this.model.getChildAt(this.model.root, index);
			} while (index++ < childCount && mxUtils.getValue(this.getCellStyle(cell), 'locked', '0') == '1')
			
			if (cell != null)
			{
				this.setDefaultParent(cell);
			}
		}
	};

	/**
	 * Specifies special libraries that are loaded via dynamic JS. Add cases
	 * where the filename cannot be worked out from the package name. The
	 * standard scheme for this mapping is stencils/packagename.xml. If there
	 * are multiple XML files, any JS files or any anomalies in the filename or
	 * directory that contains the file, then an entry must be added here and
	 * in EmbedServlet2 for the loading of the shapes to work.
	 */
	// Required to avoid 404 for mockup.xml since naming of mxgraph.mockup.anchor does not contain
	// buttons even though it is defined in the mxMockupButtons.js file. This could only be fixed
	// with aliases for existing shapes or aliases for basenames, but this is essentially the same.
	mxStencilRegistry.libraries['mockup'] = [SHAPES_PATH + '/mockup/mxMockupButtons.js'];
	
	mxStencilRegistry.libraries['arrows2'] = [SHAPES_PATH + '/mxArrows.js'];
	mxStencilRegistry.libraries['bpmn'] = [SHAPES_PATH + '/bpmn/mxBpmnShape2.js', STENCIL_PATH + '/bpmn.xml'];
	mxStencilRegistry.libraries['er'] = [SHAPES_PATH + '/er/mxER.js'];
	mxStencilRegistry.libraries['ios'] = [SHAPES_PATH + '/mockup/mxMockupiOS.js'];
	mxStencilRegistry.libraries['rackGeneral'] = [SHAPES_PATH + '/rack/mxRack.js', STENCIL_PATH + '/rack/general.xml'];
	mxStencilRegistry.libraries['rackF5'] = [STENCIL_PATH + '/rack/f5.xml'];
	mxStencilRegistry.libraries['lean_mapping'] = [SHAPES_PATH + '/mxLeanMap.js', STENCIL_PATH + '/lean_mapping.xml'];
	mxStencilRegistry.libraries['basic'] = [SHAPES_PATH + '/mxBasic.js', STENCIL_PATH + '/basic.xml'];
	mxStencilRegistry.libraries['ios7icons'] = [STENCIL_PATH + '/ios7/icons.xml'];
	mxStencilRegistry.libraries['ios7ui'] = [SHAPES_PATH + '/ios7/mxIOS7Ui.js', STENCIL_PATH + '/ios7/misc.xml'];
	mxStencilRegistry.libraries['android'] = [SHAPES_PATH + '/mxAndroid.js', STENCIL_PATH + '/android/android.xml'];
	mxStencilRegistry.libraries['electrical/transmission'] = [SHAPES_PATH + '/mxElectrical.js', STENCIL_PATH + '/electrical/transmission.xml'];
	mxStencilRegistry.libraries['mockup/buttons'] = [SHAPES_PATH + '/mockup/mxMockupButtons.js'];
	mxStencilRegistry.libraries['mockup/containers'] = [SHAPES_PATH + '/mockup/mxMockupContainers.js'];
	mxStencilRegistry.libraries['mockup/forms'] = [SHAPES_PATH + '/mockup/mxMockupForms.js'];
	mxStencilRegistry.libraries['mockup/graphics'] = [SHAPES_PATH + '/mockup/mxMockupGraphics.js', STENCIL_PATH + '/mockup/misc.xml'];
	mxStencilRegistry.libraries['mockup/markup'] = [SHAPES_PATH + '/mockup/mxMockupMarkup.js'];
	mxStencilRegistry.libraries['mockup/misc'] = [SHAPES_PATH + '/mockup/mxMockupMisc.js', STENCIL_PATH + '/mockup/misc.xml'];
	mxStencilRegistry.libraries['mockup/navigation'] = [SHAPES_PATH + '/mockup/mxMockupNavigation.js', STENCIL_PATH + '/mockup/misc.xml'];
	mxStencilRegistry.libraries['mockup/text'] = [SHAPES_PATH + '/mockup/mxMockupText.js'];
	mxStencilRegistry.libraries['floorplan'] = [SHAPES_PATH + '/mxFloorplan.js', STENCIL_PATH + '/floorplan.xml'];
	mxStencilRegistry.libraries['bootstrap'] = [SHAPES_PATH + '/mxBootstrap.js', STENCIL_PATH + '/bootstrap.xml'];
	mxStencilRegistry.libraries['gmdl'] = [SHAPES_PATH + '/mxGmdl.js', STENCIL_PATH + '/gmdl.xml'];
	mxStencilRegistry.libraries['cabinets'] = [SHAPES_PATH + '/mxCabinets.js', STENCIL_PATH + '/cabinets.xml'];
	mxStencilRegistry.libraries['archimate'] = [SHAPES_PATH + '/mxArchiMate.js'];
	mxStencilRegistry.libraries['archimate3'] = [SHAPES_PATH + '/mxArchiMate3.js'];
	mxStencilRegistry.libraries['sysml'] = [SHAPES_PATH + '/mxSysML.js'];
	mxStencilRegistry.libraries['eip'] = [SHAPES_PATH + '/mxEip.js', STENCIL_PATH + '/eip.xml'];
	mxStencilRegistry.libraries['networks'] = [SHAPES_PATH + '/mxNetworks.js', STENCIL_PATH + '/networks.xml'];
	mxStencilRegistry.libraries['aws3d'] = [SHAPES_PATH + '/mxAWS3D.js', STENCIL_PATH + '/aws3d.xml'];
	mxStencilRegistry.libraries['pid2inst'] = [SHAPES_PATH + '/pid2/mxPidInstruments.js'];
	mxStencilRegistry.libraries['pid2misc'] = [SHAPES_PATH + '/pid2/mxPidMisc.js', STENCIL_PATH + '/pid/misc.xml'];
	mxStencilRegistry.libraries['pid2valves'] = [SHAPES_PATH + '/pid2/mxPidValves.js'];
	mxStencilRegistry.libraries['pidFlowSensors'] = [STENCIL_PATH + '/pid/flow_sensors.xml'];

	// Triggers dynamic loading for markers
	mxMarker.getPackageForType = function(type)
	{
		var name = null;
		
		if (type != null && type.length > 0)
		{
			if (type.substring(0, 2) == 'ER')
			{
				name = 'mxgraph.er';
			}
			else if (type.substring(0, 5) == 'sysML')
			{
				name = 'mxgraph.sysml';
			}
		}
		
		return name;
	};
	
	var mxMarkerCreateMarker = mxMarker.createMarker;
	
	mxMarker.createMarker = function(canvas, shape, type, pe, unitX, unitY, size, source, sw, filled)
	{
		if (type != null)
		{
			var f = mxMarker.markers[type];
			
			if (f == null)
			{
				var name = this.getPackageForType(type);
				
				if (name != null)
				{
					mxStencilRegistry.getStencil(name);
				}
			}
		}
		
		return mxMarkerCreateMarker.apply(this, arguments);
	};
})();

/**
 * Copyright (c) 2006-2016, JGraph Ltd
 */
/**
 * No CSS and resources available in embed mode. Parameters and docs:
 * https://desk.draw.io/solution/articles/16000042542-how-to-embed-html-
 */
GraphViewer = function(container, xmlNode, graphConfig)
{
	this.init(container, xmlNode, graphConfig);
};

// Editor inherits from mxEventSource
mxUtils.extend(GraphViewer, mxEventSource);

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.prototype.editBlankUrl = 'https://www.draw.io/?client=1';

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.prototype.editBlankFallbackUrl = 'https://www.draw.io/?create=drawdata&splash=0';

/**
 * Base URL for relative images.
 */
GraphViewer.prototype.imageBaseUrl = 'https://www.draw.io/';

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.prototype.toolbarHeight = (document.compatMode == 'BackCompat') ? 28 : 30;

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.prototype.lightboxChrome = true;

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.prototype.lightboxZIndex = 999;

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.prototype.toolbarZIndex = 999;

/**
 * Base URL for relative images.
 */
GraphViewer.prototype.imageBaseUrl = 'https://www.draw.io/';

/**
 * If automatic fit should be enabled if zoom is disabled. Default is true.
 */
GraphViewer.prototype.autoFit = true;

/**
 * Specifies if zooming in for auto fir is allowed. Default is false.
 */
GraphViewer.prototype.allowZoomIn = false;

/**
 * Whether the title should be shown as a tooltip if the toolbar is disabled.
 * Default is false.
 */
GraphViewer.prototype.showTitleAsTooltip = false;

/**
 * Specifies if the constructur should delay the rendering if the container
 * is not visible by default.
 */
GraphViewer.prototype.checkVisibleState = true;

/**
 * Initializes the viewer.
 */
GraphViewer.prototype.init = function(container, xmlNode, graphConfig)
{
	this.graphConfig = (graphConfig != null) ? graphConfig : {};
	this.autoFit = (graphConfig['auto-fit'] != null) ?
		graphConfig['auto-fit'] : this.autoFit;
	this.allowZoomIn = (graphConfig['allow-zoom-in'] != null) ?
		graphConfig['allow-zoom-in'] : this.allowZoomIn;
	this.checkVisibleState = (graphConfig['check-visible-state'] != null) ?
		graphConfig['check-visible-state'] : this.checkVisibleState;
	this.toolbarItems = (this.graphConfig.toolbar != null) ?
		this.graphConfig.toolbar.split(' ') : [];
	this.zoomEnabled = mxUtils.indexOf(this.toolbarItems, 'zoom') >= 0;
	this.layersEnabled = mxUtils.indexOf(this.toolbarItems, 'layers') >= 0;
	this.lightboxEnabled = mxUtils.indexOf(this.toolbarItems, 'lightbox') >= 0;
	this.lightboxClickEnabled = this.graphConfig.lightbox != false;
	this.initialWidth = (container != null) ? container.style.width : null;
	this.widthIsEmpty = (this.initialWidth != null) ? this.initialWidth == '' : true;
	this.editor = null;

	if (xmlNode != null)
	{
		this.xmlDocument = xmlNode.ownerDocument;
		this.xmlNode = xmlNode;
		this.xml = mxUtils.getXml(xmlNode);

		if (container != null)
		{
			this.graph = new Graph(container);
			this.graph.transparentBackground = false;
			
			if (this.graphConfig.move)
			{
				this.graph.isMoveCellsEvent = function(evt)
				{
					return true;
				};
			}
	
			// Adds lightbox and link handling for shapes
			if (this.lightboxClickEnabled)
			{
				container.style.cursor = 'pointer';
			}
			
			// Hack for using EditorUi methods on the graph instance
			this.editor = new Editor(true, null, null, this.graph);
			this.editor.editBlankUrl = this.editBlankUrl;
			this.editor.editBlankFallbackUrl = this.editBlankFallbackUrl;
			this.graph.lightbox = true;
			this.graph.centerZoom = false;
			this.graph.autoExtend = false;
			this.graph.autoScroll = false;
			this.graph.setEnabled(false);
			
			// Handles relative images
			var self = this;
			
			this.graph.getImageFromBundles = function(key)
			{
				return self.getImageUrl(key);
			};
	
			if (mxClient.IS_SVG)
			{
				// LATER: Add shadow for labels in graph.container (eg. math, NO_FO), scaling
				this.editor.graph.addSvgShadow(this.graph.view.canvas.ownerSVGElement, null, true);
			}
			
			// Adds page placeholders
			this.currentPage = parseInt(this.graphConfig.page) || 0;
			
			if (xmlNode.nodeName == 'mxfile')
			{
				var diagrams = xmlNode.getElementsByTagName('diagram');
				
				if (diagrams.length > 0)
				{
					var graphGetGlobalVariable = this.graph.getGlobalVariable;
					var self = this;
					
					this.graph.getGlobalVariable = function(name)
					{
						var diagram = diagrams[self.currentPage];
						
						if (name == 'page')
						{
							return diagram.getAttribute('name') || 'Page-' + (self.currentPage + 1);
						}
						else if (name == 'pagenumber')
						{
							return self.currentPage + 1;
						}
						
						return graphGetGlobalVariable.apply(this, arguments);
					};
				}
			}
	
			// Passes current page via urlParams global variable
			// to let the parser know which page we're using
			urlParams['page'] = self.currentPage;
			
			var render = mxUtils.bind(this, function()
			{
				this.graph.getModel().beginUpdate();
				try
				{
					// Required for correct parsing of fold parameter
					urlParams['nav'] = (this.graphConfig.nav != false) ? '1' : '0';
					
					this.editor.setGraphXml(this.xmlNode);
					this.graph.border = (this.graphConfig.border != null) ? this.graphConfig.border : 8;
					this.graph.view.scale = this.graphConfig.zoom || 1;
				}
				finally
				{
					this.graph.getModel().endUpdate();
				}
		
				// Adds left-button panning only if scrollbars are visible
				this.graph.panningHandler.useLeftButtonForPanning = true;
				this.graph.panningHandler.isForcePanningEvent = function(me)
				{
					return !mxEvent.isPopupTrigger(me.getEvent()) &&
						this.graph.container.style.overflow == 'auto';
				};
				this.graph.panningHandler.usePopupTrigger = false;
				this.graph.panningHandler.pinchEnabled = false;
				this.graph.panningHandler.ignoreCell = true;
				this.graph.setPanning(false);
		
				this.addSizeHandler();
				this.showLayers(this.graph);
				this.addClickHandler(this.graph);
				this.graph.setTooltips(this.graphConfig.tooltips != false);
				this.graph.initialViewState = {
					translate: this.graph.view.translate.clone(),
					scale: this.graph.view.scale
				};
		
				if (this.graphConfig.toolbar != null)
				{
					this.addToolbar();
				}
				else if (this.graphConfig.title != null && this.showTitleAsTooltip)
				{
					container.setAttribute('title', this.graphConfig.title);
				}
			});

			var MutObs = window.MutationObserver ||
				window.WebKitMutationObserver ||
				window.MozMutationObserver;
			
			if (this.checkVisibleState && container.offsetWidth == 0 && typeof MutObs !== 'undefined')
			{
				// Delayed rendering if inside hidden container and event available
				var par = this.getObservableParent(container);
			
				var observer = new MutObs(mxUtils.bind(this, function(mutation)
				{
					if (container.offsetWidth > 0)
					{
						observer.disconnect();
						render();
					}
				}));
				
				observer.observe(par, {attributes: true});
			}
			else
			{
				// Immediate rendering in all other cases
				render();
			}
		}
	}
};

/**
 * 
 */
GraphViewer.prototype.getObservableParent = function(container)
{
	var node = container.parentNode;
	
	while (node != document.body && node.parentNode != null &&
		mxUtils.getCurrentStyle(node).display !== 'none')
	{
		node = node.parentNode;
	}
	
	return node;
};

/**
 * 
 */
GraphViewer.prototype.getImageUrl = function(url)
{
	if (url != null && url.substring(0, 7) != 'http://' &&
		url.substring(0, 8) != 'https://' && url.substring(0, 10) != 'data:image')
	{
		if (url.charAt(0) == '/')
		{
			url = url.substring(1, url.length);
		}
		
		url = this.imageBaseUrl + url;
	}
	
	return url;
};

/**
 * 
 */
GraphViewer.prototype.setXmlNode = function(xmlNode)
{
	this.xmlDocument = xmlNode.ownerDocument;
	this.xml = mxUtils.getXml(xmlNode);
	this.xmlNode = xmlNode;
	
	this.updateGraphXml(xmlNode);
	this.fireEvent(new mxEventObject('xmlNodeChanged'));
};

/**
 * 
 */
GraphViewer.prototype.setFileNode = function(xmlNode)
{
	if (this.xmlNode == null)
	{
		this.xmlDocument = xmlNode.ownerDocument;
		this.xml = mxUtils.getXml(xmlNode);
		this.xmlNode = xmlNode;
	}
	
	this.setGraphXml(xmlNode);
};

/**
 * 
 */
GraphViewer.prototype.updateGraphXml = function(xmlNode)
{
	this.setGraphXml(xmlNode);
	this.fireEvent(new mxEventObject('graphChanged'));
};

/**
 * 
 */
GraphViewer.prototype.setGraphXml = function(xmlNode)
{
	if (this.graph != null)
	{
		this.graph.view.translate = new mxPoint();
		this.graph.view.scale = 1;
		this.graph.getModel().clear();
		this.editor.setGraphXml(xmlNode);
				
		// Restores initial CSS state
		if (this.widthIsEmpty)
		{
			this.graph.container.style.width = '';
			this.graph.container.style.height = '';
		}
		else
		{
			this.graph.container.style.width = this.initialWidth;
		}
		
		this.positionGraph();
		this.graph.initialViewState = {
			translate: this.graph.view.translate.clone(),
			scale: this.graph.view.scale
		};
	}
};

/**
 * 
 */
GraphViewer.prototype.addSizeHandler = function()
{
	var container = this.graph.container;
	var bounds = this.graph.getGraphBounds();
	var updatingOverflow = false;
	container.style.overflow = 'hidden';
	
	var updateOverflow = mxUtils.bind(this, function()
	{
		if (!updatingOverflow)
		{
			updatingOverflow = true;
			var tmp = this.graph.getGraphBounds();
			
			if (container.offsetWidth < tmp.width + this.graph.border)
			{
				container.style.overflow = 'auto';
			}
			else
			{
				container.style.overflow = 'hidden';
			}
			
			if (this.toolbar != null)
			{
				var r = container.getBoundingClientRect();
				
				// Workaround for position:relative set in ResizeSensor
				var origin = mxUtils.getScrollOrigin(document.body)
				var b = (document.body.style.position === 'relative') ? document.body.getBoundingClientRect() :
					{left: -origin.x, top: -origin.y};
				r = {left: r.left - b.left, top: r.top - b.top, bottom: r.bottom - b.top, right: r.right - b.left};
				
				this.toolbar.style.left = r.left + 'px';
				
				if (this.graphConfig['toolbar-position'] == 'bottom')
				{
					this.toolbar.style.top = r.bottom - 1 + 'px';
				}
				else
				{
					if (this.graphConfig['toolbar-position'] != 'inline')
					{
						this.toolbar.style.width = Math.max(this.minToolbarWidth, container.offsetWidth) + 'px';
						this.toolbar.style.top = r.top + 1 + 'px';
					}
					else
					{
						this.toolbar.style.top = r.top + 'px';
					}
				}
			}
			
			updatingOverflow = false;
		}
	});

	var lastOffsetWidth = null;
	var cachedOffsetWidth = null;
	var handlingResize = false;
	
	// Installs function on instance
	this.fitGraph = function(maxScale)
	{
		var cachedOffsetWidth = container.offsetWidth;
		
		if (cachedOffsetWidth != lastOffsetWidth)
		{
			if (!handlingResize)
			{
				handlingResize = true;

				this.graph.maxFitScale = (maxScale != null) ? maxScale : (this.graphConfig.zoom ||
					((this.allowZoomIn) ? null : 1));
				this.graph.fit(null, null, null, null, false, true);
				this.graph.maxFitScale = null;
				
				var tmp = this.graph.getGraphBounds();
				this.updateContainerHeight(container, tmp.height + 2 * this.graph.border + 1);

				this.graph.initialViewState = {
					translate: this.graph.view.translate.clone(),
					scale: this.graph.view.scale
				};
				
				lastOffsetWidth = cachedOffsetWidth;
				
				// Workaround for fit triggering scrollbars triggering doResize (infinite loop)
				window.setTimeout(function()
				{
					handlingResize = false;
				}, 0);
			}
		}
	};

	// Fallback for older browsers
	if (mxClient.IS_QUIRKS || document.documentMode <= 9)
	{
		mxEvent.addListener(window, 'resize', updateOverflow);
		this.graph.addListener('size', updateOverflow);
	}
	else
	{
		new ResizeSensor(this.graph.container, updateOverflow);
	}
	
	if (this.graphConfig.resize || ((this.zoomEnabled || !this.autoFit) && this.graphConfig.resize != false))
	{
		this.graph.minimumContainerSize = new mxRectangle(0, 0, 100, this.toolbarHeight);
		this.graph.resizeContainer = true;
	}
	else
	{
		// Sets initial size for responsive diagram to stop at actual size
		if (this.widthIsEmpty)
		{
			this.updateContainerWidth(container, bounds.width + 2 * this.graph.border);
		}
		
		this.updateContainerHeight(container, bounds.height + 2 * this.graph.border + 1);

		if (!this.zoomEnabled && this.autoFit)
		{
			var lastOffsetWidth = null;
			var scheduledResize = null;
			var cachedOffsetWidth = null;
			
			var doResize = mxUtils.bind(this, function()
			{
				window.clearTimeout(scheduledResize);
				
				if (!handlingResize)
				{
					scheduledResize = window.setTimeout(mxUtils.bind(this, this.fitGraph), 100);
				}
			});
			
			// Fallback for older browsers
			if (mxClient.IS_QUIRKS || document.documentMode <= 9)
			{
				mxEvent.addListener(window, 'resize', doResize);
			}
			else
			{
				new ResizeSensor(this.graph.container, doResize);
			}
		}
		else if (!(mxClient.IS_QUIRKS || document.documentMode <= 9))
		{
			this.graph.addListener('size', updateOverflow);
		}
	}

	var positionGraph = mxUtils.bind(this, function()
	{
		// Allocates maximum width while setting initial view state
		var prev = container.style.minWidth;
		
		if (this.widthIsEmpty)
		{
			container.style.minWidth = '100%';
		}
		
		if (container.offsetWidth > 0 && (this.allowZoomIn ||
			(bounds.width + 2 * this.graph.border > container.offsetWidth ||
			bounds.height + 2 * this.graph.border > this.graphConfig['max-height'])))
		{
			var maxScale = null;
			
			if (this.graphConfig['max-height'] != null)
			{
				maxScale = this.graphConfig['max-height'] / (bounds.height + 2 * this.graph.border);
			}

			this.fitGraph(maxScale);
		}
		else
		{
			this.graph.view.setTranslate(Math.floor((this.graph.border - bounds.x) / this.graph.view.scale),
				Math.floor((this.graph.border - bounds.y) / this.graph.view.scale));
			lastOffsetWidth = container.offsetWidth;
		}
		
		container.style.minWidth = prev
	});

	if (mxClient.IS_QUIRKS || document.documentMode == 8)
	{
		window.setTimeout(positionGraph, 0);
	}
	else
	{
		positionGraph();
	}

	// Installs function on instance
	this.positionGraph = function()
	{
		bounds = this.graph.getGraphBounds();
		lastOffsetWidth = null;
		positionGraph();
	};
};

/**
 * 
 */
GraphViewer.prototype.updateContainerWidth = function(container, width)
{
	container.style.width = width + 'px';
};

/**
 * 
 */
GraphViewer.prototype.updateContainerHeight = function(container, height)
{
	if (this.zoomEnabled || !this.autoFit || document.compatMode == 'BackCompat' ||
		mxClient.IS_QUIRKS || document.documentMode == 8)
	{
		container.style.height = height + 'px';
	}
};

/**
 * Shows the 
 */
GraphViewer.prototype.showLayers = function(graph, sourceGraph)
{
	var layers = this.graphConfig.layers;
	
	if (layers != null || sourceGraph != null)
	{
		var idx = (layers != null) ? layers.split(' ') : null;
		
		if (sourceGraph != null || idx.length > 0)
		{
			var source = (sourceGraph != null) ? sourceGraph.getModel() : null;
			var model = graph.getModel();
			model.beginUpdate();
			
			try
			{
				var childCount = model.getChildCount(model.root);
				
				// Hides all layers
				for (var i = 0; i < childCount; i++)
				{
					model.setVisible(model.getChildAt(model.root, i),
						(sourceGraph != null) ? source.isVisible(source.getChildAt(source.root, i)) : false);
				}
				
				// Shows specified layers (eg. 0 1 3)
				if (source == null)
				{
					for (var i = 0; i < idx.length; i++)
					{
						model.setVisible(model.getChildAt(model.root, parseInt(idx[i])), true);
					}
				}
			}
			finally
			{
				model.endUpdate();
			}
		}
	}
};

/**
 * 
 */
GraphViewer.prototype.addToolbar = function()
{
	var container = this.graph.container;
	var initialCursor = this.graph.container.style.cursor;
	
	if (this.graphConfig['toolbar-position'] == 'bottom')
	{
		container.style.marginBottom = this.toolbarHeight + 'px';
	}
	else if (this.graphConfig['toolbar-position'] != 'inline')
	{
		container.style.marginTop = this.toolbarHeight + 'px';
	}

	// Creates toolbar for viewer
	var toolbar = container.ownerDocument.createElement('div');
	toolbar.style.position = 'absolute';
	toolbar.style.overflow = 'hidden';
	toolbar.style.boxSizing = 'border-box';
	toolbar.style.whiteSpace = 'nowrap';
	toolbar.style.zIndex = this.toolbarZIndex;
	toolbar.style.backgroundColor = '#eee';
	toolbar.style.height = this.toolbarHeight + 'px';
	this.toolbar = toolbar;
	
	if (this.graphConfig['toolbar-position'] == 'inline')
	{
		mxUtils.setPrefixedStyle(toolbar.style, 'transition', 'opacity 100ms ease-in-out');
		mxUtils.setOpacity(toolbar, 30);
		
		// Changes toolbar opacity on hover
		var fadeThread = null;
		var fadeThread2 = null;
		
		var fadeOut = mxUtils.bind(this, function(delay)
		{
			if (fadeThread != null)
			{
				window.clearTimeout(fadeThread);
				fadeThead = null;
			}
			
			if (fadeThread2 != null)
			{
				window.clearTimeout(fadeThread2);
				fadeThead2 = null;
			}
			
			fadeThread = window.setTimeout(mxUtils.bind(this, function()
			{
			 	mxUtils.setOpacity(toolbar, 0);
				fadeThread = null;
			 	
				fadeThread2 = window.setTimeout(mxUtils.bind(this, function()
				{
					toolbar.style.display = 'none';
					fadeThread2 = null;
				}), 100);
			}), delay || 200);
		});
		
		var fadeIn = mxUtils.bind(this, function(opacity)
		{
			if (fadeThread != null)
			{
				window.clearTimeout(fadeThread);
				fadeThead = null;
			}
			
			if (fadeThread2 != null)
			{
				window.clearTimeout(fadeThread2);
				fadeThead2 = null;
			}
			
			toolbar.style.display = '';
			mxUtils.setOpacity(toolbar, opacity || 30);
		});
		
		mxEvent.addListener(this.graph.container, (mxClient.IS_POINTER) ? 'pointermove' : 'mousemove', mxUtils.bind(this, function(evt)
		{
			if (!mxEvent.isTouchEvent(evt))
			{
				fadeIn(30);
				fadeOut();
			}
		}));
		
		mxEvent.addListener(toolbar, (mxClient.IS_POINTER) ? 'pointermove' : 'mousemove', function(evt)
		{
			mxEvent.consume(evt);
		});
		
		mxEvent.addListener(toolbar, 'mouseenter', mxUtils.bind(this, function(evt)
		{
			fadeIn(100);
		}));

		mxEvent.addListener(toolbar, 'mousemove',  mxUtils.bind(this, function(evt)
		{
			fadeIn(100);
			mxEvent.consume(evt);
		}));

		mxEvent.addListener(toolbar, 'mouseleave',  mxUtils.bind(this, function(evt)
		{
			if (!mxEvent.isTouchEvent(evt))
			{
				fadeIn(30);
			}
		}));
		
		// Shows/hides toolbar for touch devices
		var graph = this.graph;
		var tol = graph.getTolerance();

		graph.addMouseListener(
		{
		    startX: 0,
		    startY: 0,
		    scrollLeft: 0,
		    scrollTop: 0,
		    mouseDown: function(sender, me)
		    {
		    	this.startX = me.getGraphX();
		    	this.startY = me.getGraphY();
			    this.scrollLeft = graph.container.scrollLeft;
			    this.scrollTop = graph.container.scrollTop;
		    },
		    mouseMove: function(sender, me) {},
		    mouseUp: function(sender, me)
		    {
		    	if (mxEvent.isTouchEvent(me.getEvent()))
		    	{
			    	if ((Math.abs(this.scrollLeft - graph.container.scrollLeft) < tol &&
			    		Math.abs(this.scrollTop - graph.container.scrollTop) < tol) &&
			    		(Math.abs(this.startX - me.getGraphX()) < tol &&
			    		Math.abs(this.startY - me.getGraphY()) < tol))
			    	{
			    		if (parseFloat(toolbar.style.opacity || 0) > 0)
			    		{
			    			fadeOut();
			    		}
			    		else
			    		{
			    			fadeIn(30);
			    		}
					}
		    	}
		    }
		});
	}
	
	var tokens = this.toolbarItems;
	var buttonCount = 0;
	
	function addButton(fn, imgSrc, tip, enabled)
	{
		var a = document.createElement('div');
		a.style.borderRight = '1px solid #d0d0d0';
		a.style.padding = '3px 6px 3px 6px';
		mxEvent.addListener(a, 'click', fn);

		if (tip != null)
		{
			a.setAttribute('title', tip);
		}
		
		if (mxClient.IS_QUIRKS)
		{
			a.style.display = 'inline';
		}
		else
		{
			a.style.display = 'inline-block';
		}
		
		var img = document.createElement('img');
		img.setAttribute('border', '0');
		img.setAttribute('src', imgSrc);
		
		if (enabled == null || enabled)
		{
			mxEvent.addListener(a, 'mouseenter', function()
			{
				a.style.backgroundColor = '#ddd';
			});
			
			mxEvent.addListener(a, 'mouseleave', function()
			{
				a.style.backgroundColor = '#eee';
			});

			mxUtils.setOpacity(img, 60);
			a.style.cursor = 'pointer';
		}
		else
		{
			mxUtils.setOpacity(a, 30);
		}
		
		a.appendChild(img);
		toolbar.appendChild(a);
		
		buttonCount++;
		
		return a;
	};

	var layersDialog = null;
	var layersDialogEntered = false;
	var pageInfo = null;
	
	for (var i = 0; i < tokens.length; i++)
	{
		var token = tokens[i];
		
		if (token == 'pages')
		{
			var diagrams = [];

			pageInfo = container.ownerDocument.createElement('div');
			pageInfo.style.cssText = 'display:inline-block;position:relative;padding:3px 4px 0 4px;' +
				'vertical-align:top;font-family:Helvetica,Arial;font-size:12px;top:4px;cursor:default;'
			mxUtils.setOpacity(pageInfo, 70);
			
			var prevButton = addButton(mxUtils.bind(this, function()
			{
				this.currentPage = mxUtils.mod(this.currentPage - 1, diagrams.length);
				pageInfo.innerHTML = '';
				mxUtils.write(pageInfo, (this.currentPage + 1) + ' / ' + diagrams.length);
				this.updateGraphXml(mxUtils.parseXml(this.graph.decompress(mxUtils.getTextContent(
					diagrams[this.currentPage]))).documentElement);
			}), Editor.previousImage, mxResources.get('previousPage') || 'Previous Page');

			prevButton.style.borderRightStyle = 'none';
			prevButton.style.paddingLeft = '0px';
			prevButton.style.paddingRight = '0px';
			toolbar.appendChild(pageInfo);

			var nextButton = addButton(mxUtils.bind(this, function()
			{
				this.currentPage = mxUtils.mod(this.currentPage + 1, diagrams.length);
				pageInfo.innerHTML = '';
				mxUtils.write(pageInfo, (this.currentPage + 1) + ' / ' + diagrams.length);
				this.updateGraphXml(mxUtils.parseXml(this.graph.decompress(mxUtils.getTextContent(
					diagrams[this.currentPage]))).documentElement);
			}), Editor.nextImage, mxResources.get('nextPage') || 'Next Page');
			
			nextButton.style.paddingLeft = '0px';
			nextButton.style.paddingRight = '0px';
			
			var lastXmlNode = null;
			
			var update = mxUtils.bind(this, function()
			{
				if (this.xmlNode == null || this.xmlNode.nodeName != 'mxfile')
				{
					diagrams = [];
				}
				if (this.xmlNode != lastXmlNode)
				{
					diagrams = this.xmlNode.getElementsByTagName('diagram');
					pageInfo.innerHTML = '';
					mxUtils.write(pageInfo, (this.currentPage + 1) + ' / ' + diagrams.length);
					lastXmlNode = this.xmlNode;
				}
				
				pageInfo.style.display = (diagrams.length > 1) ? 'inline-block' : 'none';
				prevButton.style.display = pageInfo.style.display;
				nextButton.style.display = pageInfo.style.display;
			});
			
			// LATER: Add event for setGraphXml
			this.addListener('xmlNodeChanged', update);
			update();
		}
		else if (token == 'zoom')
		{
			if (this.zoomEnabled)
			{
				addButton(mxUtils.bind(this, function()
				{ 
					this.graph.zoomOut();
				}), Editor.zoomOutImage, mxResources.get('zoomOut') || 'Zoom Out');

				addButton(mxUtils.bind(this, function()
				{
					this.graph.zoomIn();
				}), Editor.zoomInImage, mxResources.get('zoomIn') || 'Zoom In');

				addButton(mxUtils.bind(this, function()
				{
					this.graph.view.scaleAndTranslate(this.graph.initialViewState.scale,
						this.graph.initialViewState.translate.x,
						this.graph.initialViewState.translate.y);
				}), Editor.zoomFitImage, mxResources.get('fit') || 'Fit');
			}
		}
		else if (token == 'layers')
		{
			if (this.layersEnabled)
			{
				var model = this.graph.getModel();

				var layersButton = addButton(mxUtils.bind(this, function(evt)
				{
					if (layersDialog != null)
					{
						layersDialog.parentNode.removeChild(layersDialog);
						layersDialog = null;
					}
					else
					{
						layersDialog = this.graph.createLayersDialog();
						
						mxEvent.addListener(layersDialog, 'mouseleave', function()
						{
							layersDialog.parentNode.removeChild(layersDialog);
							layersDialog = null;
						});
						
						var r = layersButton.getBoundingClientRect();

						layersDialog.style.width = '140px';
						layersDialog.style.padding = '2px 0px 2px 0px';
						layersDialog.style.border = '1px solid #d0d0d0';
						layersDialog.style.backgroundColor = '#eee';
						layersDialog.style.fontFamily = 'Helvetica Neue,Helvetica,Arial Unicode MS,Arial';
						layersDialog.style.fontSize = '11px';
						layersDialog.style.zIndex = this.toolbarZIndex + 1;
						mxUtils.setOpacity(layersDialog, 80);
						var origin = mxUtils.getDocumentScrollOrigin(document);
						layersDialog.style.left = origin.x + r.left + 'px';
						layersDialog.style.top = origin.y + r.bottom + 'px';
						
						document.body.appendChild(layersDialog);
					}
				}), Editor.layersImage, mxResources.get('layers') || 'Layers');
				
				model.addListener(mxEvent.CHANGE, function()
				{
					layersButton.style.display = (model.getChildCount(model.root) > 1) ? 'inline-block' : 'none';
				});
				
				layersButton.style.display = (model.getChildCount(model.root) > 1) ? 'inline-block' : 'none';
			}
		}
		else if (token == 'lightbox')
		{
			if (this.lightboxEnabled)
			{
				addButton(mxUtils.bind(this, function()
				{
					this.showLightbox();
				}), Editor.maximizeImage, (mxResources.get('show') || 'Show'));
			}
		}
		else if (this.graphConfig['toolbar-buttons'] != null)
		{
			var def = this.graphConfig['toolbar-buttons'][token];
			
			if (def != null)
			{
				addButton((def.enabled == null || def.enabled) ? def.handler : function() {},
					def.image, def.title, def.enabled);
			}
		}
	}
	
	if (this.graph.minimumContainerSize != null)
	{
		this.graph.minimumContainerSize.width = buttonCount * 34;
	}
	
	if (this.graphConfig.title != null)
	{
		var filename = container.ownerDocument.createElement('div');
		filename.style.cssText = 'display:inline-block;position:relative;padding:3px 6px 0 6px;' +
			'vertical-align:top;font-family:Helvetica,Arial;font-size:12px;top:4px;cursor:default;'
		filename.setAttribute('title', this.graphConfig.title);
		mxUtils.write(filename, this.graphConfig.title);
		mxUtils.setOpacity(filename, 70);
		
		toolbar.appendChild(filename);
	}
	
	this.minToolbarWidth = buttonCount * 34;
	var prevBorder = container.style.border;
	
	var enter = mxUtils.bind(this, function()
	{
		var r = container.getBoundingClientRect();

		// Workaround for position:relative set in ResizeSensor
		var origin = mxUtils.getScrollOrigin(document.body)
		var b = (document.body.style.position === 'relative') ? document.body.getBoundingClientRect() :
			{left: -origin.x, top: -origin.y};
		r = {left: r.left - b.left, top: r.top - b.top, bottom: r.bottom - b.top, right: r.right - b.left};
		
		toolbar.style.left = r.left + 'px';
		toolbar.style.width = (this.graphConfig['toolbar-position'] == 'inline') ? 'auto' :
			Math.max(this.minToolbarWidth, container.offsetWidth) + 'px';
		toolbar.style.border = '1px solid #d0d0d0';
				
		if (this.graphConfig['toolbar-position'] == 'bottom')
		{
			toolbar.style.top = r.bottom - 1 + 'px';
		}
		else
		{
			if (this.graphConfig['toolbar-position'] != 'inline')
			{
				toolbar.style.marginTop = -this.toolbarHeight + 'px';
				toolbar.style.top = r.top + 1 + 'px';
			}
			else
			{
				toolbar.style.top = r.top + 'px';
			}
		}
		
		if (prevBorder == '1px solid transparent')
		{
			container.style.border = '1px solid #d0d0d0';
		}
		
		document.body.appendChild(toolbar);
		
		var hideToolbar = mxUtils.bind(this, function()
		{
			if (this.graphConfig['toolbar-nohide'] != true)
			{
				if (toolbar.parentNode != null)
				{
					toolbar.parentNode.removeChild(toolbar);
				}
				
				if (layersDialog != null)
				{
					layersDialog.parentNode.removeChild(layersDialog);
					layersDialog = null;
				}
				
				container.style.border = prevBorder;
			}
		});
		
		mxEvent.addListener(document, 'mousemove', function(evt)
		{
			var source = mxEvent.getSource(evt);
			
			while (source != null)
			{
				if (source == container || source == toolbar || source == layersDialog)
				{
					return;
				}
				
				source = source.parentNode;
			}
			
			hideToolbar();
		});
		
		mxEvent.addListener(document, 'mouseleave', function(evt)
		{
			hideToolbar();
		});
	});

	mxEvent.addListener(container, 'mouseenter', enter);
};

/**
 * Adds event handler for links and lightbox.
 */
GraphViewer.prototype.addClickHandler = function(graph, ui)
{
	graph.linkPolicy = this.graphConfig.target || graph.linkPolicy;
	
	graph.addClickHandler(this.graphConfig.highlight, function(evt)
	{
		if (ui != null)
		{
			var elt = mxEvent.getSource(evt)
			var href = elt.getAttribute('href');
			
			if (href != null && !(graph.isExternalProtocol(href) || graph.isBlankLink(href)))
			{
				// Hides lightbox if any links are clicked
				ui.destroy();
			}
		}
	}, mxUtils.bind(this, function(evt)
	{
		if (ui == null && this.lightboxClickEnabled &&
			(!mxEvent.isTouchEvent(evt) ||
			this.toolbarItems.length == 0))
		{
			this.showLightbox();
		}
	}));
};

/**
 * Adds the given array of stencils to avoid dynamic loading of shapes.
 */
GraphViewer.prototype.showLightbox = function()
{
	if (this.graphConfig.lightbox == 'open' || window.self !== window.top)
	{
		var p = (this.layersEnabled) ? '&layers=1' : '';
		
		if (typeof window.postMessage !== 'undefined' && (document.documentMode == null || document.documentMode >= 10))
		{
			var wnd = null;
			
			var receive = mxUtils.bind(this, function(evt)
			{
				if (evt.data == 'ready' && evt.source == wnd)
				{
					wnd.postMessage(this.xml, '*');
					mxEvent.removeListener(window, 'message', receive);
				}
			});
			
			mxEvent.addListener(window, 'message', receive);
			wnd = window.open('https://www.draw.io/?client=1&lightbox=1&close=1&edit=_blank' + p);
		}
		else
		{
			// Data is pulled from global variable after tab loads
			window.drawdata = this.xml;
			window.open('https://www.draw.io/?client=1&lightbox=1&edit=_blank' + p);
		}
	}
	else
	{
		this.showLocalLightbox();
	}
};


/**
 * Adds the given array of stencils to avoid dynamic loading of shapes.
 */
GraphViewer.prototype.showLocalLightbox = function()
{
	var origin = mxUtils.getDocumentScrollOrigin(document);
	var backdrop = document.createElement('div');

	if (mxClient.IS_QUIRKS)
	{
		backdrop.style.position = 'absolute';
		backdrop.style.left = origin.x + 'px';
		backdrop.style.top = origin.y + 'px';
		backdrop.style.width = document.body.offsetWidth + 'px';
		backdrop.style.height = document.body.offsetHeight + 'px';
	}
	else
	{
		backdrop.style.cssText = 'position:fixed;top:0;left:0;bottom:0;right:0;';
	}

	backdrop.style.zIndex = this.lightboxZIndex;
	backdrop.style.backgroundColor = '#000000';
	mxUtils.setOpacity(backdrop, 70);
	
	document.body.appendChild(backdrop);
	
	var closeImg = document.createElement('img');
	closeImg.setAttribute('border', '0');
	closeImg.setAttribute('src', Editor.closeImage);
	
	if (mxClient.IS_QUIRKS)
	{
		closeImg.style.position = 'absolute';
		closeImg.style.right = 32 + 'px';
		closeImg.style.top = origin.y + 32 + 'px';
	}
	else
	{
		closeImg.style.cssText = 'position:fixed;top:32px;right:32px;';
	}
	
	closeImg.style.cursor = 'pointer';
	
	mxEvent.addListener(closeImg, 'click', function()
	{
		ui.destroy();
	});
	
	// LATER: Make possible to assign after instance was created
	urlParams['pages'] = '1';
	urlParams['page'] = this.currentPage;
	urlParams['nav'] = (this.graphConfig.nav != false) ? '1' : '0';
	urlParams['layers'] = (this.layersEnabled) ? '1' : '0';
	
	// PostMessage not working and Permission denied for opened access in IE9-
	if (document.documentMode == null || document.documentMode >= 10)
	{
		Editor.prototype.editButtonLink = this.graphConfig.edit;
	}
	
	EditorUi.prototype.updateActionStates = function() {};
	EditorUi.prototype.addBeforeUnloadListener = function() {};
	EditorUi.prototype.addChromelessClickHandler = function() {};
	
	// Workaround for lost reference with same ID (cannot override after instance is created)
	Graph.prototype.shadowId = 'lightboxDropShadow';
	
	var ui = new EditorUi(new Editor(true), document.createElement('div'), true);
	
	// Workaround for lost reference with same ID
	Graph.prototype.shadowId = 'dropShadow';
	
	// Disables refresh
	ui.refresh = function() {};
	
	// Click on backdrop closes lightbox
	mxEvent.addListener(backdrop, 'click', function()
	{
		ui.destroy();
	});
	
	// Passes current page and local URLs to open in new window action
	ui.editor.editBlankUrl = this.editBlankUrl;
	ui.editor.editBlankFallbackUrl = this.editBlankFallbackUrl;
	var editorGetEditBlankUrl = ui.editor.getEditBlankUrl;
	
	ui.editor.getEditBlankUrl = function(params, fallback)
	{
		var param = '';
		
		if (ui.pages != null && ui.currentPage != null)
		{
			var pageIndex = mxUtils.indexOf(ui.pages, ui.currentPage);
		
			if (pageIndex > 0)
			{
				param = '&page=' + pageIndex;
			}
		}
		
		return editorGetEditBlankUrl.apply(this, arguments) + param;
	}

	// Handles escape keystroke
	var keydownHandler = mxUtils.bind(this, function(evt)
	{
		if (evt.keyCode == 27 /* Escape */)
		{
			ui.destroy();
		}
	});

	var destroy = ui.destroy;
	ui.destroy = function()
	{
		mxEvent.removeListener(document.documentElement, 'keydown', keydownHandler);
		document.body.removeChild(backdrop);
		document.body.removeChild(closeImg);
		document.body.style.overflow = 'auto';
		GraphViewer.resizeSensorEnabled = true;
		
		destroy.apply(this, arguments);
	};
	
	var graph = ui.editor.graph;
	var lightbox = graph.container;
	lightbox.style.overflow = 'hidden';
	
	if (this.lightboxChrome)
	{
		lightbox.style.border = '1px solid #c0c0c0';
		lightbox.style.margin = '40px';

		// Installs the keystroke listener in the target
		mxEvent.addListener(document.documentElement, 'keydown', keydownHandler);
	}
	else
	{
		backdrop.style.display = 'none';
		closeImg.style.display = 'none';
	}
	
	// Handles relative images
	var self = this;
	
	graph.getImageFromBundles = function(key)
	{
		return self.getImageUrl(key);
	};
	
	if (this.graphConfig.move)
	{
		graph.isMoveCellsEvent = function(evt)
		{
			return true;
		};
	}
	
	if (!mxClient.IS_QUIRKS)
	{
		mxUtils.setPrefixedStyle(lightbox.style, 'border-radius', '4px');
		lightbox.style.position = 'fixed';
	}
	
	GraphViewer.resizeSensorEnabled = false;
	document.body.style.overflow = 'hidden';

	// Workaround for possible rendering issues in Safari
	if (!mxClient.IS_SF)
	{
		mxUtils.setPrefixedStyle(lightbox.style, 'transform', 'rotateY(90deg)');
		mxUtils.setPrefixedStyle(lightbox.style, 'transition', 'all .25s ease-in-out');
	}
	
	this.addClickHandler(graph, ui);

	window.setTimeout(mxUtils.bind(this, function()
	{
		// Disables focus border in Chrome
		lightbox.style.outline = 'none';
		lightbox.style.zIndex = this.lightboxZIndex;
		closeImg.style.zIndex = this.lightboxZIndex;

		document.body.appendChild(lightbox);
		document.body.appendChild(closeImg);
		
		ui.setFileData(this.xml);

		mxUtils.setPrefixedStyle(lightbox.style, 'transform', 'rotateY(0deg)');
		ui.chromelessToolbar.style.bottom = 60 + 'px';
		ui.chromelessToolbar.style.zIndex = this.lightboxZIndex;
		
		// Workaround for clipping in IE11-
		document.body.appendChild(ui.chromelessToolbar);
	
		ui.getEditBlankXml = mxUtils.bind(this, function()
		{
			return this.xml;
		});
	
		if (mxClient.IS_QUIRKS)
		{
			lightbox.style.position = 'absolute';
			lightbox.style.display = 'block';
			lightbox.style.left = origin.x + 'px';
			lightbox.style.top = origin.y + 'px';
			lightbox.style.width = document.body.clientWidth - 80 + 'px';
			lightbox.style.height = document.body.clientHeight - 80 + 'px';
			lightbox.style.backgroundColor = 'white';
			
			ui.chromelessToolbar.style.display = 'block';
			ui.chromelessToolbar.style.position = 'absolute';
			ui.chromelessToolbar.style.bottom = '';
			ui.chromelessToolbar.style.top = origin.y +
				document.body.clientHeight - 100 + 'px';
		}
		
		ui.lightboxFit();
		ui.chromelessResize();
		this.showLayers(graph, this.graph);
	}), 0);

	return ui;
};

/**
 * 
 */
GraphViewer.processElements = function(classname)
{
	mxUtils.forEach(GraphViewer.getElementsByClassName(classname || 'mxgraph'), function(div)
	{
		try
		{
			div.innerHTML = '';
			GraphViewer.createViewerForElement(div);
		}
		catch (e)
		{
			div.innerHTML = e.message;
			throw e;
		}
	});
};

/**
 * Adds the given array of stencils to avoid dynamic loading of shapes.
 */
GraphViewer.getElementsByClassName = function(classname)
{
	if (document.getElementsByClassName)
	{
		var divs = document.getElementsByClassName(classname);
		
		// Workaround for changing divs while processing
		var result = [];
		
		for (var i = 0; i < divs.length; i++)
		{
			result.push(divs[i]);
		}
		
		return result;
	}
	else
	{
		var tmp = document.getElementsByTagName('*');
		var divs = [];
	
		for (var i = 0; i < tmp.length; i++)
		{
			var cls = tmp[i].className;

			if (cls != null && cls.length > 0)
			{
				var tokens = cls.split(' ');
				
				if (mxUtils.indexOf(tokens, classname) >= 0)
				{
					divs.push(tmp[i]);
				}
			}
		}

		return divs;
	}
};

/**
 * Adds the given array of stencils to avoid dynamic loading of shapes.
 */
GraphViewer.createViewerForElement = function(element, callback)
{
	var data = element.getAttribute('data-mxgraph');
	
	if (data != null)
	{
		var config = JSON.parse(data);
		
		var createViewer = function(xml)
		{
			var xmlDoc = mxUtils.parseXml(xml);
			var viewer = new GraphViewer(element, xmlDoc.documentElement, config);
			
			if (callback != null)
			{
				callback(viewer);
			}
		};

		if (config.url != null)
		{
			GraphViewer.getUrl(config.url, function(xml)
			{
				createViewer(xml);
			});
		}
		else
		{
			createViewer(config.xml);
		}
	}
};

/**
 * Adds event if grid size is changed.
 */
GraphViewer.initCss = function()
{
	try
	{
		var style = document.createElement('style')
		style.type = 'text/css'
		style.innerHTML = ['div.mxTooltip {',
			'-webkit-box-shadow: 3px 3px 12px #C0C0C0;',
			'-moz-box-shadow: 3px 3px 12px #C0C0C0;',
			'box-shadow: 3px 3px 12px #C0C0C0;',
			'background: #FFFFCC;',
			'border-style: solid;',
			'border-width: 1px;',
			'border-color: black;',
			'font-family: Arial;',
			'font-size: 8pt;',
			'position: absolute;',
			'cursor: default;',
			'padding: 4px;',
			'color: black;}',
			'td.mxPopupMenuIcon div {',
			'width:16px;',
			'height:16px;}',
			'html div.mxPopupMenu {',
			'-webkit-box-shadow:2px 2px 3px #d5d5d5;',
			'-moz-box-shadow:2px 2px 3px #d5d5d5;',
			'box-shadow:2px 2px 3px #d5d5d5;',
			'_filter:progid:DXImageTransform.Microsoft.DropShadow(OffX=2, OffY=2, Color=\'#d0d0d0\',Positive=\'true\');',
			'background:white;',
			'position:absolute;',
			'border:3px solid #e7e7e7;',
			'padding:3px;}',
			'html table.mxPopupMenu {',
			'border-collapse:collapse;',
			'margin:0px;}',
			'html td.mxPopupMenuItem {',
			'padding:7px 30px 7px 30px;',
			'font-family:Helvetica Neue,Helvetica,Arial Unicode MS,Arial;',
			'font-size:10pt;}',
			'html td.mxPopupMenuIcon {',
			'background-color:white;',
			'padding:0px;}',
			'td.mxPopupMenuIcon .geIcon {',
			'padding:2px;',
			'padding-bottom:4px;',
			'margin:2px;',
			'border:1px solid transparent;',
			'opacity:0.5;',
			'_width:26px;',
			'_height:26px;}',
			'td.mxPopupMenuIcon .geIcon:hover {',
			'border:1px solid gray;',
			'border-radius:2px;',
			'opacity:1;}',
			'html tr.mxPopupMenuItemHover {',
			'background-color: #eeeeee;',
			'color: black;}',
			'table.mxPopupMenu hr {',
			'color:#cccccc;',
			'background-color:#cccccc;',
			'border:none;',
			'height:1px;}',
			'table.mxPopupMenu tr {	font-size:4pt;}'].join('\n');
		document.getElementsByTagName('head')[0].appendChild(style)
	}
	catch (e)
	{
		// ignore
	}
};

/**
 * Lookup for URLs.
 */
GraphViewer.cachedUrls = {};

/**
 * Workaround for unsupported CORS in IE9 XHR
 */
GraphViewer.getUrl = function(url, onload, onerror)
{
	if (GraphViewer.cachedUrls[url] != null)
	{
		onload(GraphViewer.cachedUrls[url]);
	}
	else
	{
		var xhr = (navigator.userAgent.indexOf('MSIE 9') > 0) ? new XDomainRequest() : new XMLHttpRequest();
		xhr.open('GET', url);
		
	    xhr.onload = function()
	    {
	    	onload((xhr.getText != null) ? xhr.getText() : xhr.responseText);
		};
		
	    xhr.onerror = onerror;
	    xhr.send();
	}
};

/**
 * Redirects editing to absolue URLs.
 */
GraphViewer.resizeSensorEnabled = true;

/**
 * Copyright Marc J. Schmidt. See the LICENSE file at the top-level
 * directory of this distribution and at
 * https://github.com/marcj/css-element-queries/blob/master/LICENSE.
 */
(function() {

    // Only used for the dirty checking, so the event callback count is limted to max 1 call per fps per sensor.
    // In combination with the event based resize sensor this saves cpu time, because the sensor is too fast and
    // would generate too many unnecessary events.
    var requestAnimationFrame = window.requestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        function (fn) {
            return window.setTimeout(fn, 20);
        };

    /**
     * Class for dimension change detection.
     *
     * @param {Element|Element[]|Elements|jQuery} element
     * @param {Function} callback
     *
     * @constructor
     */
    var ResizeSensor = function(element, fn) {
    	
    	var callback = function()
    	{
    		if (GraphViewer.resizeSensorEnabled)
    		{
    			fn();
    		}
    	};
    	
        /**
         *
         * @constructor
         */
        function EventQueue() {
            this.q = [];
            this.add = function(ev) {
                this.q.push(ev);
            };

            var i, j;
            this.call = function() {
                for (i = 0, j = this.q.length; i < j; i++) {
                    this.q[i].call();
                }
            };
        }

        /**
         * @param {HTMLElement} element
         * @param {String}      prop
         * @returns {String|Number}
         */
        function getComputedStyle(element, prop) {
            if (element.currentStyle) {
                return element.currentStyle[prop];
            } else if (window.getComputedStyle) {
                return window.getComputedStyle(element, null).getPropertyValue(prop);
            } else {
                return element.style[prop];
            }
        }

        /**
         *
         * @param {HTMLElement} element
         * @param {Function}    resized
         */
        function attachResizeEvent(element, resized) {
            if (!element.resizedAttached) {
                element.resizedAttached = new EventQueue();
                element.resizedAttached.add(resized);
            } else if (element.resizedAttached) {
                element.resizedAttached.add(resized);
                return;
            }

            element.resizeSensor = document.createElement('div');
            element.resizeSensor.className = 'resize-sensor';
            var style = 'position: absolute; left: 0; top: 0; right: 0; bottom: 0; overflow: hidden; z-index: -1; visibility: hidden;';
            var styleChild = 'position: absolute; left: 0; top: 0; transition: 0s;';

            element.resizeSensor.style.cssText = style;
            element.resizeSensor.innerHTML =
                '<div class="resize-sensor-expand" style="' + style + '">' +
                    '<div style="' + styleChild + '"></div>' +
                '</div>' +
                '<div class="resize-sensor-shrink" style="' + style + '">' +
                    '<div style="' + styleChild + ' width: 200%; height: 200%"></div>' +
                '</div>';
            element.appendChild(element.resizeSensor);

            // FIXME: Should not change element style
            if (getComputedStyle(element, 'position') == 'static') {
                element.style.position = 'relative';
            }

            var expand = element.resizeSensor.childNodes[0];
            var expandChild = expand.childNodes[0];
            var shrink = element.resizeSensor.childNodes[1];

            var reset = function() {
                expandChild.style.width  = 100000 + 'px';
                expandChild.style.height = 100000 + 'px';

                expand.scrollLeft = 100000;
                expand.scrollTop = 100000;

                shrink.scrollLeft = 100000;
                shrink.scrollTop = 100000;
            };

            reset();
            var dirty = false;

            var dirtyChecking = function() {
                if (!element.resizedAttached) return;

                if (dirty) {
                    element.resizedAttached.call();
                    dirty = false;
                }

                requestAnimationFrame(dirtyChecking);
            };

            requestAnimationFrame(dirtyChecking);
            var lastWidth, lastHeight;
            var cachedWidth, cachedHeight; //useful to not query offsetWidth twice

            var onScroll = function() {
              if ((cachedWidth = element.offsetWidth) != lastWidth || (cachedHeight = element.offsetHeight) != lastHeight) {
                  dirty = true;

                  lastWidth = cachedWidth;
                  lastHeight = cachedHeight;
              }
              reset();
            };

            var addEvent = function(el, name, cb) {
                if (el.attachEvent) {
                    el.attachEvent('on' + name, cb);
                } else {
                    el.addEventListener(name, cb);
                }
            };

            addEvent(expand, 'scroll', onScroll);
            addEvent(shrink, 'scroll', onScroll);
        }

        var elementType = Object.prototype.toString.call(element);
        var isCollectionTyped = ('[object Array]' === elementType
            || ('[object NodeList]' === elementType)
            || ('[object HTMLCollection]' === elementType)
            || ('undefined' !== typeof jQuery && element instanceof jQuery) //jquery
            || ('undefined' !== typeof Elements && element instanceof Elements) //mootools
        );

        if (isCollectionTyped) {
            var i = 0, j = element.length;
            for (; i < j; i++) {
                attachResizeEvent(element[i], callback);
            }
        } else {
            attachResizeEvent(element, callback);
        }

        this.detach = function() {
            if (isCollectionTyped) {
                var i = 0, j = element.length;
                for (; i < j; i++) {
                    ResizeSensor.detach(element[i]);
                }
            } else {
                ResizeSensor.detach(element);
            }
        };
    };

    ResizeSensor.detach = function(element) {
        if (element.resizeSensor) {
            element.removeChild(element.resizeSensor);
            delete element.resizeSensor;
            delete element.resizedAttached;
        }
    };

    window.ResizeSensor = ResizeSensor;
})();

