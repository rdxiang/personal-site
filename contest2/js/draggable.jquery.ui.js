;
(function ($) {
    $.ui = {plugin: {add: function (module, option, set) {
        var proto = $.ui[module].prototype;
        for (var i in set) {
            proto.plugins[i] = proto.plugins[i] || [];
            proto.plugins[i].push([option, set[i]]);
        }
    }, call: function (instance, name, args) {
        var set = instance.plugins[name];
        if (!set) {
            return;
        }
        for (var i = 0; i < set.length; i++) {
            if (instance.options[set[i][0]]) {
                set[i][1].apply(instance.element, args);
            }
        }
    }}, cssCache: {}, css: function (name) {
        if ($.ui.cssCache[name]) {
            return $.ui.cssCache[name];
        }
        var tmp = $('<div class="ui-gen">').addClass(name).css({position: 'absolute', top: '-5000px', left: '-5000px', display: 'block'}).appendTo('body');
        $.ui.cssCache[name] = !!((!(/auto|default/).test(tmp.css('cursor')) || (/^[1-9]/).test(tmp.css('height')) || (/^[1-9]/).test(tmp.css('width')) || !(/none/).test(tmp.css('backgroundImage')) || !(/transparent|rgba\(0, 0, 0, 0\)/).test(tmp.css('backgroundColor'))));
        try {
            $('body').get(0).removeChild(tmp.get(0));
        } catch (e) {
        }
        return $.ui.cssCache[name];
    }, disableSelection: function (el) {
        $(el).attr('unselectable', 'on').css('MozUserSelect', 'none');
    }, enableSelection: function (el) {
        $(el).attr('unselectable', 'off').css('MozUserSelect', '');
    }, hasScroll: function (e, a) {
        var scroll = /top/.test(a || "top") ? 'scrollTop' : 'scrollLeft', has = false;
        if (e[scroll] > 0)return true;
        e[scroll] = 1;
        has = e[scroll] > 0 ? true : false;
        e[scroll] = 0;
        return has;
    }};
    var _remove = $.fn.remove;
    $.fn.remove = function () {
        $("*", this).add(this).triggerHandler("remove");
        return _remove.apply(this, arguments);
    };
    function getter(namespace, plugin, method) {
        var methods = $[namespace][plugin].getter || [];
        methods = (typeof methods == "string" ? methods.split(/,?\s+/) : methods);
        return($.inArray(method, methods) != -1);
    }

    $.widget = function (name, prototype) {
        var namespace = name.split(".")[0];
        name = name.split(".")[1];
        $.fn[name] = function (options) {
            var isMethodCall = (typeof options == 'string'), args = Array.prototype.slice.call(arguments, 1);
            if (isMethodCall && getter(namespace, name, options)) {
                var instance = $.data(this[0], name);
                return(instance ? instance[options].apply(instance, args) : undefined);
            }
            return this.each(function () {
                var instance = $.data(this, name);
                if (isMethodCall && instance && $.isFunction(instance[options])) {
                    instance[options].apply(instance, args);
                } else if (!isMethodCall) {
                    $.data(this, name, new $[namespace][name](this, options));
                }
            });
        };
        $[namespace][name] = function (element, options) {
            var self = this;
            this.widgetName = name;
            this.widgetBaseClass = namespace + '-' + name;
            this.options = $.extend({}, $.widget.defaults, $[namespace][name].defaults, options);
            this.element = $(element).bind('setData.' + name,function (e, key, value) {
                return self.setData(key, value);
            }).bind('getData.' + name,function (e, key) {
                return self.getData(key);
            }).bind('remove', function () {
                return self.destroy();
            });
            this.init();
        };
        $[namespace][name].prototype = $.extend({}, $.widget.prototype, prototype);
    };
    $.widget.prototype = {init: function () {
    }, destroy: function () {
        this.element.removeData(this.widgetName);
    }, getData: function (key) {
        return this.options[key];
    }, setData: function (key, value) {
        this.options[key] = value;
        if (key == 'disabled') {
            this.element[value ? 'addClass' : 'removeClass'](this.widgetBaseClass + '-disabled');
        }
    }, enable: function () {
        this.setData('disabled', false);
    }, disable: function () {
        this.setData('disabled', true);
    }};
    $.widget.defaults = {disabled: false};
    $.ui.mouse = {mouseInit: function () {
        var self = this;
        this.element.bind('mousedown.' + this.widgetName, function (e) {
            return self.mouseDown(e);
        });
        if ($.browser.msie) {
            this._mouseUnselectable = this.element.attr('unselectable');
            this.element.attr('unselectable', 'on');
        }
        this.started = false;
    }, mouseDestroy: function () {
        this.element.unbind('.' + this.widgetName);
        ($.browser.msie && this.element.attr('unselectable', this._mouseUnselectable));
    }, mouseDown: function (e) {
        (this._mouseStarted && this.mouseUp(e));
        this._mouseDownEvent = e;
        var self = this, btnIsLeft = (e.which == 1), elIsCancel = (typeof this.options.cancel == "string" ? $(e.target).parents().add(e.target).filter(this.options.cancel).length : false);
        if (!btnIsLeft || elIsCancel || !this.mouseCapture(e)) {
            return true;
        }
        this._mouseDelayMet = !this.options.delay;
        if (!this._mouseDelayMet) {
            this._mouseDelayTimer = setTimeout(function () {
                self._mouseDelayMet = true;
            }, this.options.delay);
        }
        if (this.mouseDistanceMet(e) && this.mouseDelayMet(e)) {
            this._mouseStarted = (this.mouseStart(e) !== false);
            if (!this._mouseStarted) {
                e.preventDefault();
                return true;
            }
        }
        this._mouseMoveDelegate = function (e) {
            return self.mouseMove(e);
        };
        this._mouseUpDelegate = function (e) {
            return self.mouseUp(e);
        };
        $(document).bind('mousemove.' + this.widgetName, this._mouseMoveDelegate).bind('mouseup.' + this.widgetName, this._mouseUpDelegate);
        return false;
    }, mouseMove: function (e) {
        if ($.browser.msie && !e.button) {
            return this.mouseUp(e);
        }
        if (this._mouseStarted) {
            this.mouseDrag(e);
            return false;
        }
        if (this.mouseDistanceMet(e) && this.mouseDelayMet(e)) {
            this._mouseStarted = (this.mouseStart(this._mouseDownEvent, e) !== false);
            (this._mouseStarted ? this.mouseDrag(e) : this.mouseUp(e));
        }
        return!this._mouseStarted;
    }, mouseUp: function (e) {
        $(document).unbind('mousemove.' + this.widgetName, this._mouseMoveDelegate).unbind('mouseup.' + this.widgetName, this._mouseUpDelegate);
        if (this._mouseStarted) {
            this._mouseStarted = false;
            this.mouseStop(e);
        }
        return false;
    }, mouseDistanceMet: function (e) {
        return(Math.max(Math.abs(this._mouseDownEvent.pageX - e.pageX), Math.abs(this._mouseDownEvent.pageY - e.pageY)) >= this.options.distance);
    }, mouseDelayMet: function (e) {
        return this._mouseDelayMet;
    }, mouseStart: function (e) {
    }, mouseDrag: function (e) {
    }, mouseStop: function (e) {
    }, mouseCapture: function (e) {
        return true;
    }};
    $.ui.mouse.defaults = {cancel: null, distance: 1, delay: 0};
})(jQuery);
(function ($) {
    $.widget("ui.draggable", $.extend({}, $.ui.mouse, {init: function () {
        var o = this.options;
        if (o.helper == 'original' && !(/(relative|absolute|fixed)/).test(this.element.css('position')))
            this.element.css('position', 'relative');
        this.element.addClass('ui-draggable');
        (o.disabled && this.element.addClass('ui-draggable-disabled'));
        this.mouseInit();
    }, mouseStart: function (e) {
        var o = this.options;
        if (this.helper || o.disabled || $(e.target).is('.ui-resizable-handle'))return false;
        var handle = !this.options.handle || !$(this.options.handle, this.element).length ? true : false;
        $(this.options.handle, this.element).find("*").andSelf().each(function () {
            if (this == e.target)handle = true;
        });
        if (!handle)return false;
        if ($.ui.ddmanager)$.ui.ddmanager.current = this;
        this.helper = $.isFunction(o.helper) ? $(o.helper.apply(this.element[0], [e])) : (o.helper == 'clone' ? this.element.clone() : this.element);
        if (!this.helper.parents('body').length)this.helper.appendTo((o.appendTo == 'parent' ? this.element[0].parentNode : o.appendTo));
        if (this.helper[0] != this.element[0] && !(/(fixed|absolute)/).test(this.helper.css("position")))this.helper.css("position", "absolute");
        this.margins = {left: (parseInt(this.element.css("marginLeft"), 10) || 0), top: (parseInt(this.element.css("marginTop"), 10) || 0)};
        this.cssPosition = this.helper.css("position");
        this.offset = this.element.offset();
        this.offset = {top: this.offset.top - this.margins.top, left: this.offset.left - this.margins.left};
        this.offset.click = {left: e.pageX - this.offset.left, top: e.pageY - this.offset.top};
        this.offsetParent = this.helper.offsetParent();
        var po = this.offsetParent.offset();
        if (this.offsetParent[0] == document.body && $.browser.mozilla)po = {top: 0, left: 0};
        this.offset.parent = {top: po.top + (parseInt(this.offsetParent.css("borderTopWidth"), 10) || 0), left: po.left + (parseInt(this.offsetParent.css("borderLeftWidth"), 10) || 0)};
        var p = this.element.position();
        this.offset.relative = this.cssPosition == "relative" ? {top: p.top - (parseInt(this.helper.css("top"), 10) || 0) + this.offsetParent[0].scrollTop, left: p.left - (parseInt(this.helper.css("left"), 10) || 0) + this.offsetParent[0].scrollLeft} : {top: 0, left: 0};
        this.originalPosition = this.generatePosition(e);
        this.helperProportions = {width: this.helper.outerWidth(), height: this.helper.outerHeight()};
        if (o.cursorAt) {
            if (o.cursorAt.left != undefined)this.offset.click.left = o.cursorAt.left + this.margins.left;
            if (o.cursorAt.right != undefined)this.offset.click.left = this.helperProportions.width - o.cursorAt.right + this.margins.left;
            if (o.cursorAt.top != undefined)this.offset.click.top = o.cursorAt.top + this.margins.top;
            if (o.cursorAt.bottom != undefined)this.offset.click.top = this.helperProportions.height - o.cursorAt.bottom + this.margins.top;
        }
        if (o.containment) {
            if (o.containment == 'parent')o.containment = this.helper[0].parentNode;
            if (o.containment == 'document' || o.containment == 'window')this.containment = [0 - this.offset.relative.left - this.offset.parent.left, 0 - this.offset.relative.top - this.offset.parent.top, $(o.containment == 'document' ? document : window).width() - this.offset.relative.left - this.offset.parent.left - this.helperProportions.width - this.margins.left - (parseInt(this.element.css("marginRight"), 10) || 0), ($(o.containment == 'document' ? document : window).height() || document.body.parentNode.scrollHeight) - this.offset.relative.top - this.offset.parent.top - this.helperProportions.height - this.margins.top - (parseInt(this.element.css("marginBottom"), 10) || 0)];
            if (!(/^(document|window|parent)$/).test(o.containment)) {
                var ce = $(o.containment)[0];
                var co = $(o.containment).offset();
                this.containment = [co.left + (parseInt($(ce).css("borderLeftWidth"), 10) || 0) - this.offset.relative.left - this.offset.parent.left, co.top + (parseInt($(ce).css("borderTopWidth"), 10) || 0) - this.offset.relative.top - this.offset.parent.top, co.left + Math.max(ce.scrollWidth, ce.offsetWidth) - (parseInt($(ce).css("borderLeftWidth"), 10) || 0) - this.offset.relative.left - this.offset.parent.left - this.helperProportions.width - this.margins.left - (parseInt(this.element.css("marginRight"), 10) || 0), co.top + Math.max(ce.scrollHeight, ce.offsetHeight) - (parseInt($(ce).css("borderTopWidth"), 10) || 0) - this.offset.relative.top - this.offset.parent.top - this.helperProportions.height - this.margins.top - (parseInt(this.element.css("marginBottom"), 10) || 0)];
            }
        }
        this.propagate("start", e);
        this.helperProportions = {width: this.helper.outerWidth(), height: this.helper.outerHeight()};
        if ($.ui.ddmanager && !o.dropBehaviour)$.ui.ddmanager.prepareOffsets(this, e);
        this.helper.addClass("ui-draggable-dragging");
        this.mouseDrag(e);
        return true;
    }, convertPositionTo: function (d, pos) {
        if (!pos)pos = this.position;
        var mod = d == "absolute" ? 1 : -1;
        return{top: (pos.top
            + this.offset.relative.top * mod
            + this.offset.parent.top * mod
            - (this.cssPosition == "fixed" || (this.cssPosition == "absolute" && this.offsetParent[0] == document.body) ? 0 : this.offsetParent[0].scrollTop) * mod
            + (this.cssPosition == "fixed" ? $(document).scrollTop() : 0) * mod
            + this.margins.top * mod), left: (pos.left
            + this.offset.relative.left * mod
            + this.offset.parent.left * mod
            - (this.cssPosition == "fixed" || (this.cssPosition == "absolute" && this.offsetParent[0] == document.body) ? 0 : this.offsetParent[0].scrollLeft) * mod
            + (this.cssPosition == "fixed" ? $(document).scrollLeft() : 0) * mod
            + this.margins.left * mod)};
    }, generatePosition: function (e) {
        var o = this.options;
        var position = {top: (e.pageY
            - this.offset.click.top
            - this.offset.relative.top
            - this.offset.parent.top
            + (this.cssPosition == "fixed" || (this.cssPosition == "absolute" && this.offsetParent[0] == document.body) ? 0 : this.offsetParent[0].scrollTop)
            - (this.cssPosition == "fixed" ? $(document).scrollTop() : 0)), left: (e.pageX
            - this.offset.click.left
            - this.offset.relative.left
            - this.offset.parent.left
            + (this.cssPosition == "fixed" || (this.cssPosition == "absolute" && this.offsetParent[0] == document.body) ? 0 : this.offsetParent[0].scrollLeft)
            - (this.cssPosition == "fixed" ? $(document).scrollLeft() : 0))};
        if (!this.originalPosition)return position;
        if (this.containment) {
            if (position.left < this.containment[0])position.left = this.containment[0];
            if (position.top < this.containment[1])position.top = this.containment[1];
            if (position.left > this.containment[2])position.left = this.containment[2];
            if (position.top > this.containment[3])position.top = this.containment[3];
        }
        if (o.grid) {
            var top = this.originalPosition.top + Math.round((position.top - this.originalPosition.top) / o.grid[1]) * o.grid[1];
            position.top = this.containment ? (!(top < this.containment[1] || top > this.containment[3]) ? top : (!(top < this.containment[1]) ? top - o.grid[1] : top + o.grid[1])) : top;
            var left = this.originalPosition.left + Math.round((position.left - this.originalPosition.left) / o.grid[0]) * o.grid[0];
            position.left = this.containment ? (!(left < this.containment[0] || left > this.containment[2]) ? left : (!(left < this.containment[0]) ? left - o.grid[0] : left + o.grid[0])) : left;
        }
        return position;
    }, mouseDrag: function (e) {
        this.position = this.generatePosition(e);
        this.positionAbs = this.convertPositionTo("absolute");
        this.position = this.propagate("drag", e) || this.position;
        if (!this.options.axis || this.options.axis != "y")this.helper[0].style.left = this.position.left + 'px';
        if (!this.options.axis || this.options.axis != "x")this.helper[0].style.top = this.position.top + 'px';
        if ($.ui.ddmanager)$.ui.ddmanager.drag(this, e);
        return false;
    }, mouseStop: function (e) {
        var dropped = false;
        if ($.ui.ddmanager && !this.options.dropBehaviour)
            var dropped = $.ui.ddmanager.drop(this, e);
        if ((this.options.revert == "invalid" && !dropped) || (this.options.revert == "valid" && dropped) || this.options.revert === true) {
            var self = this;
            $(this.helper).animate(this.originalPosition, parseInt(this.options.revert, 10) || 500, function () {
                self.propagate("stop", e);
                self.clear();
            });
        } else {
            this.propagate("stop", e);
            this.clear();
        }
        return false;
    }, clear: function () {
        this.helper.removeClass("ui-draggable-dragging");
        if (this.options.helper != 'original' && !this.cancelHelperRemoval)this.helper.remove();
        this.helper = null;
        this.cancelHelperRemoval = false;
    }, plugins: {}, uiHash: function (e) {
        return{helper: this.helper, position: this.position, absolutePosition: this.positionAbs, options: this.options};
    }, propagate: function (n, e) {
        $.ui.plugin.call(this, n, [e, this.uiHash()]);
        if (n == "drag")this.positionAbs = this.convertPositionTo("absolute");
        return this.element.triggerHandler(n == "drag" ? n : "drag" + n, [e, this.uiHash()], this.options[n]);
    }, destroy: function () {
        if (!this.element.data('draggable'))return;
        this.element.removeData("draggable").unbind(".draggable").removeClass('ui-draggable');
        this.mouseDestroy();
    }}));
    $.extend($.ui.draggable, {defaults: {appendTo: "parent", axis: false, cancel: ":input", delay: 0, distance: 1, helper: "original"}});
    $.ui.plugin.add("draggable", "cursor", {start: function (e, ui) {
        var t = $('body');
        if (t.css("cursor"))ui.options._cursor = t.css("cursor");
        t.css("cursor", ui.options.cursor);
    }, stop: function (e, ui) {
        if (ui.options._cursor)$('body').css("cursor", ui.options._cursor);
    }});
    $.ui.plugin.add("draggable", "zIndex", {start: function (e, ui) {
        var t = $(ui.helper);
        if (t.css("zIndex"))ui.options._zIndex = t.css("zIndex");
        t.css('zIndex', ui.options.zIndex);
    }, stop: function (e, ui) {
        if (ui.options._zIndex)$(ui.helper).css('zIndex', ui.options._zIndex);
    }});
    $.ui.plugin.add("draggable", "opacity", {start: function (e, ui) {
        var t = $(ui.helper);
        if (t.css("opacity"))ui.options._opacity = t.css("opacity");
        t.css('opacity', ui.options.opacity);
    }, stop: function (e, ui) {
        if (ui.options._opacity)$(ui.helper).css('opacity', ui.options._opacity);
    }});
    $.ui.plugin.add("draggable", "iframeFix", {start: function (e, ui) {
        $(ui.options.iframeFix === true ? "iframe" : ui.options.iframeFix).each(function () {
            $('<div class="ui-draggable-iframeFix" style="background: #fff;"></div>').css({width: this.offsetWidth + "px", height: this.offsetHeight + "px", position: "absolute", opacity: "0.001", zIndex: 1000}).css($(this).offset()).appendTo("body");
        });
    }, stop: function (e, ui) {
        $("div.DragDropIframeFix").each(function () {
            this.parentNode.removeChild(this);
        });
    }});
    $.ui.plugin.add("draggable", "scroll", {start: function (e, ui) {
        var o = ui.options;
        var i = $(this).data("draggable");
        o.scrollSensitivity = o.scrollSensitivity || 20;
        o.scrollSpeed = o.scrollSpeed || 20;
        i.overflowY = function (el) {
            do {
                if (/auto|scroll/.test(el.css('overflow')) || (/auto|scroll/).test(el.css('overflow-y')))return el;
                el = el.parent();
            } while (el[0].parentNode);
            return $(document);
        }(this);
        i.overflowX = function (el) {
            do {
                if (/auto|scroll/.test(el.css('overflow')) || (/auto|scroll/).test(el.css('overflow-x')))return el;
                el = el.parent();
            } while (el[0].parentNode);
            return $(document);
        }(this);
        if (i.overflowY[0] != document && i.overflowY[0].tagName != 'HTML')i.overflowYOffset = i.overflowY.offset();
        if (i.overflowX[0] != document && i.overflowX[0].tagName != 'HTML')i.overflowXOffset = i.overflowX.offset();
    }, drag: function (e, ui) {
        var o = ui.options;
        var i = $(this).data("draggable");
        if (i.overflowY[0] != document && i.overflowY[0].tagName != 'HTML') {
            if ((i.overflowYOffset.top + i.overflowY[0].offsetHeight) - e.pageY < o.scrollSensitivity)
                i.overflowY[0].scrollTop = i.overflowY[0].scrollTop + o.scrollSpeed;
            if (e.pageY - i.overflowYOffset.top < o.scrollSensitivity)
                i.overflowY[0].scrollTop = i.overflowY[0].scrollTop - o.scrollSpeed;
        } else {
            if (e.pageY - $(document).scrollTop() < o.scrollSensitivity)
                $(document).scrollTop($(document).scrollTop() - o.scrollSpeed);
            if ($(window).height() - (e.pageY - $(document).scrollTop()) < o.scrollSensitivity)
                $(document).scrollTop($(document).scrollTop() + o.scrollSpeed);
        }
        if (i.overflowX[0] != document && i.overflowX[0].tagName != 'HTML') {
            if ((i.overflowXOffset.left + i.overflowX[0].offsetWidth) - e.pageX < o.scrollSensitivity)
                i.overflowX[0].scrollLeft = i.overflowX[0].scrollLeft + o.scrollSpeed;
            if (e.pageX - i.overflowXOffset.left < o.scrollSensitivity)
                i.overflowX[0].scrollLeft = i.overflowX[0].scrollLeft - o.scrollSpeed;
        } else {
            if (e.pageX - $(document).scrollLeft() < o.scrollSensitivity)
                $(document).scrollLeft($(document).scrollLeft() - o.scrollSpeed);
            if ($(window).width() - (e.pageX - $(document).scrollLeft()) < o.scrollSensitivity)
                $(document).scrollLeft($(document).scrollLeft() + o.scrollSpeed);
        }
    }});
    $.ui.plugin.add("draggable", "snap", {start: function (e, ui) {
        var inst = $(this).data("draggable");
        inst.snapElements = [];
        $(ui.options.snap === true ? '.ui-draggable' : ui.options.snap).each(function () {
            var $t = $(this);
            var $o = $t.offset();
            if (this != inst.element[0])inst.snapElements.push({item: this, width: $t.outerWidth(), height: $t.outerHeight(), top: $o.top, left: $o.left});
        });
    }, drag: function (e, ui) {
        var inst = $(this).data("draggable");
        var d = ui.options.snapTolerance || 20;
        var x1 = ui.absolutePosition.left, x2 = x1 + inst.helperProportions.width, y1 = ui.absolutePosition.top, y2 = y1 + inst.helperProportions.height;
        for (var i = inst.snapElements.length - 1; i >= 0; i--) {
            var l = inst.snapElements[i].left, r = l + inst.snapElements[i].width, t = inst.snapElements[i].top, b = t + inst.snapElements[i].height;
            if (!((l - d < x1 && x1 < r + d && t - d < y1 && y1 < b + d) || (l - d < x1 && x1 < r + d && t - d < y2 && y2 < b + d) || (l - d < x2 && x2 < r + d && t - d < y1 && y1 < b + d) || (l - d < x2 && x2 < r + d && t - d < y2 && y2 < b + d)))continue;
            if (ui.options.snapMode != 'inner') {
                var ts = Math.abs(t - y2) <= 20;
                var bs = Math.abs(b - y1) <= 20;
                var ls = Math.abs(l - x2) <= 20;
                var rs = Math.abs(r - x1) <= 20;
                if (ts)ui.position.top = inst.convertPositionTo("relative", {top: t - inst.helperProportions.height, left: 0}).top;
                if (bs)ui.position.top = inst.convertPositionTo("relative", {top: b, left: 0}).top;
                if (ls)ui.position.left = inst.convertPositionTo("relative", {top: 0, left: l - inst.helperProportions.width}).left;
                if (rs)ui.position.left = inst.convertPositionTo("relative", {top: 0, left: r}).left;
            }
            if (ui.options.snapMode != 'outer') {
                var ts = Math.abs(t - y1) <= 20;
                var bs = Math.abs(b - y2) <= 20;
                var ls = Math.abs(l - x1) <= 20;
                var rs = Math.abs(r - x2) <= 20;
                if (ts)ui.position.top = inst.convertPositionTo("relative", {top: t, left: 0}).top;
                if (bs)ui.position.top = inst.convertPositionTo("relative", {top: b - inst.helperProportions.height, left: 0}).top;
                if (ls)ui.position.left = inst.convertPositionTo("relative", {top: 0, left: l}).left;
                if (rs)ui.position.left = inst.convertPositionTo("relative", {top: 0, left: r - inst.helperProportions.width}).left;
            }
        }
        ;
    }});
    $.ui.plugin.add("draggable", "connectToSortable", {start: function (e, ui) {
        var inst = $(this).data("draggable");
        inst.sortables = [];
        $(ui.options.connectToSortable).each(function () {
            if ($.data(this, 'sortable')) {
                var sortable = $.data(this, 'sortable');
                inst.sortables.push({instance: sortable, shouldRevert: sortable.options.revert});
                sortable.refreshItems();
                sortable.propagate("activate", e, inst);
            }
        });
    }, stop: function (e, ui) {
        var inst = $(this).data("draggable");
        $.each(inst.sortables, function () {
            if (this.instance.isOver) {
                this.instance.isOver = 0;
                inst.cancelHelperRemoval = true;
                this.instance.cancelHelperRemoval = false;
                if (this.shouldRevert)this.instance.options.revert = true;
                this.instance.mouseStop(e);
                this.instance.element.triggerHandler("sortreceive", [e, $.extend(this.instance.ui(), {sender: inst.element})], this.instance.options["receive"]);
                this.instance.options.helper = this.instance.options._helper;
            } else {
                this.instance.propagate("deactivate", e, inst);
            }
        });
    }, drag: function (e, ui) {
        var inst = $(this).data("draggable"), self = this;
        var checkPos = function (o) {
            var l = o.left, r = l + o.width, t = o.top, b = t + o.height;
            return(l < (this.positionAbs.left + this.offset.click.left) && (this.positionAbs.left + this.offset.click.left) < r && t < (this.positionAbs.top + this.offset.click.top) && (this.positionAbs.top + this.offset.click.top) < b);
        };
        $.each(inst.sortables, function (i) {
            if (checkPos.call(inst, this.instance.containerCache)) {
                if (!this.instance.isOver) {
                    this.instance.isOver = 1;
                    this.instance.currentItem = $(self).clone().appendTo(this.instance.element).data("sortable-item", true);
                    this.instance.options._helper = this.instance.options.helper;
                    this.instance.options.helper = function () {
                        return ui.helper[0];
                    };
                    e.target = this.instance.currentItem[0];
                    this.instance.mouseCapture(e, true);
                    this.instance.mouseStart(e, true, true);
                    this.instance.offset.click.top = inst.offset.click.top;
                    this.instance.offset.click.left = inst.offset.click.left;
                    this.instance.offset.parent.left -= inst.offset.parent.left - this.instance.offset.parent.left;
                    this.instance.offset.parent.top -= inst.offset.parent.top - this.instance.offset.parent.top;
                    inst.propagate("toSortable", e);
                }
                if (this.instance.currentItem)this.instance.mouseDrag(e);
            } else {
                if (this.instance.isOver) {
                    this.instance.isOver = 0;
                    this.instance.cancelHelperRemoval = true;
                    this.instance.options.revert = false;
                    this.instance.mouseStop(e, true);
                    this.instance.options.helper = this.instance.options._helper;
                    this.instance.currentItem.remove();
                    if (this.instance.placeholder)this.instance.placeholder.remove();
                    inst.propagate("fromSortable", e);
                }
            }
            ;
        });
    }});
    $.ui.plugin.add("draggable", "stack", {start: function (e, ui) {
        var group = $.makeArray($(ui.options.stack.group)).sort(function (a, b) {
            return(parseInt($(a).css("zIndex"), 10) || ui.options.stack.min) - (parseInt($(b).css("zIndex"), 10) || ui.options.stack.min);
        });
        $(group).each(function (i) {
            this.style.zIndex = ui.options.stack.min + i;
        });
        this[0].style.zIndex = ui.options.stack.min + group.length;
    }});
})(jQuery);