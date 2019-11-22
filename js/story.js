(function(){

    var squiffy = {};
    
    (function () {
        'use strict';
    
        squiffy.story = {};
    
        var initLinkHandler = function () {
            var handleLink = function (link) {
                if (link.hasClass('disabled')) return;
                var passage = link.data('passage');
                var section = link.data('section');
                var rotateAttr = link.attr('data-rotate');
                var sequenceAttr = link.attr('data-sequence');
                if (passage) {
                    disableLink(link);
                    squiffy.set('_turncount', squiffy.get('_turncount') + 1);
                    passage = processLink(passage);
                    if (passage) {
                        currentSection.append('<hr/>');
                        squiffy.story.passage(passage);
                    }
                    var turnPassage = '@' + squiffy.get('_turncount');
                    if (turnPassage in squiffy.story.section.passages) {
                        squiffy.story.passage(turnPassage);
                    }
                    if ('@last' in squiffy.story.section.passages && squiffy.get('_turncount')>= squiffy.story.section.passageCount) {
                        squiffy.story.passage('@last');
                    }
                }
                else if (section) {
                    currentSection.append('<hr/>');
                    disableLink(link);
                    section = processLink(section);
                    squiffy.story.go(section);
                }
                else if (rotateAttr || sequenceAttr) {
                    var result = rotate(rotateAttr || sequenceAttr, rotateAttr ? link.text() : '');
                    link.html(result[0].replace(/&quot;/g, '"').replace(/&#39;/g, '\''));
                    var dataAttribute = rotateAttr ? 'data-rotate' : 'data-sequence';
                    link.attr(dataAttribute, result[1]);
                    if (!result[1]) {
                        disableLink(link);
                    }
                    if (link.attr('data-attribute')) {
                        squiffy.set(link.attr('data-attribute'), result[0]);
                    }
                    squiffy.story.save();
                }
            };
    
            squiffy.ui.output.on('click', 'a.squiffy-link', function () {
                handleLink(jQuery(this));
            });
    
            squiffy.ui.output.on('keypress', 'a.squiffy-link', function (e) {
                if (e.which !== 13) return;
                handleLink(jQuery(this));
            });
    
            squiffy.ui.output.on('mousedown', 'a.squiffy-link', function (event) {
                event.preventDefault();
            });
        };
    
        var disableLink = function (link) {
            link.addClass('disabled');
            link.attr('tabindex', -1);
        }
        
        squiffy.story.begin = function () {
            if (!squiffy.story.load()) {
                squiffy.story.go(squiffy.story.start);
            }
        };
    
        var processLink = function(link) {
            link = String(link);
            var sections = link.split(',');
            var first = true;
            var target = null;
            sections.forEach(function (section) {
                section = section.trim();
                if (startsWith(section, '@replace ')) {
                    replaceLabel(section.substring(9));
                }
                else {
                    if (first) {
                        target = section;
                    }
                    else {
                        setAttribute(section);
                    }
                }
                first = false;
            });
            return target;
        };
    
        var setAttribute = function(expr) {
            var lhs, rhs, op, value;
            var setRegex = /^([\w]*)\s*=\s*(.*)$/;
            var setMatch = setRegex.exec(expr);
            if (setMatch) {
                lhs = setMatch[1];
                rhs = setMatch[2];
                if (isNaN(rhs)) {
                    if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
                    squiffy.set(lhs, rhs);
                }
                else {
                    squiffy.set(lhs, parseFloat(rhs));
                }
            }
            else {
                var incDecRegex = /^([\w]*)\s*([\+\-\*\/])=\s*(.*)$/;
                var incDecMatch = incDecRegex.exec(expr);
                if (incDecMatch) {
                    lhs = incDecMatch[1];
                    op = incDecMatch[2];
                    rhs = incDecMatch[3];
                    if(startsWith(rhs,"@")) rhs=squiffy.get(rhs.substring(1));
                    rhs = parseFloat(rhs);
                    value = squiffy.get(lhs);
                    if (value === null) value = 0;
                    if (op == '+') {
                        value += rhs;
                    }
                    if (op == '-') {
                        value -= rhs;
                    }
                    if (op == '*') {
                        value *= rhs;
                    }
                    if (op == '/') {
                        value /= rhs;
                    }
                    squiffy.set(lhs, value);
                }
                else {
                    value = true;
                    if (startsWith(expr, 'not ')) {
                        expr = expr.substring(4);
                        value = false;
                    }
                    squiffy.set(expr, value);
                }
            }
        };
    
        var replaceLabel = function(expr) {
            var regex = /^([\w]*)\s*=\s*(.*)$/;
            var match = regex.exec(expr);
            if (!match) return;
            var label = match[1];
            var text = match[2];
            if (text in squiffy.story.section.passages) {
                text = squiffy.story.section.passages[text].text;
            }
            else if (text in squiffy.story.sections) {
                text = squiffy.story.sections[text].text;
            }
            var stripParags = /^<p>(.*)<\/p>$/;
            var stripParagsMatch = stripParags.exec(text);
            if (stripParagsMatch) {
                text = stripParagsMatch[1];
            }
            var $labels = squiffy.ui.output.find('.squiffy-label-' + label);
            $labels.fadeOut(1000, function() {
                $labels.html(squiffy.ui.processText(text));
                $labels.fadeIn(1000, function() {
                    squiffy.story.save();
                });
            });
        };
    
        squiffy.story.go = function(section) {
            squiffy.set('_transition', null);
            newSection();
            squiffy.story.section = squiffy.story.sections[section];
            if (!squiffy.story.section) return;
            squiffy.set('_section', section);
            setSeen(section);
            var master = squiffy.story.sections[''];
            if (master) {
                squiffy.story.run(master);
                squiffy.ui.write(master.text);
            }
            squiffy.story.run(squiffy.story.section);
            // The JS might have changed which section we're in
            if (squiffy.get('_section') == section) {
                squiffy.set('_turncount', 0);
                squiffy.ui.write(squiffy.story.section.text);
                squiffy.story.save();
            }
        };
    
        squiffy.story.run = function(section) {
            if (section.clear) {
                squiffy.ui.clearScreen();
            }
            if (section.attributes) {
                processAttributes(section.attributes);
            }
            if (section.js) {
                section.js();
            }
        };
    
        squiffy.story.passage = function(passageName) {
            var passage = squiffy.story.section.passages[passageName];
            if (!passage) return;
            setSeen(passageName);
            var masterSection = squiffy.story.sections[''];
            if (masterSection) {
                var masterPassage = masterSection.passages[''];
                if (masterPassage) {
                    squiffy.story.run(masterPassage);
                    squiffy.ui.write(masterPassage.text);
                }
            }
            var master = squiffy.story.section.passages[''];
            if (master) {
                squiffy.story.run(master);
                squiffy.ui.write(master.text);
            }
            squiffy.story.run(passage);
            squiffy.ui.write(passage.text);
            squiffy.story.save();
        };
    
        var processAttributes = function(attributes) {
            attributes.forEach(function (attribute) {
                if (startsWith(attribute, '@replace ')) {
                    replaceLabel(attribute.substring(9));
                }
                else {
                    setAttribute(attribute);
                }
            });
        };
    
        squiffy.story.restart = function() {
            if (squiffy.ui.settings.persist && window.localStorage) {
                var keys = Object.keys(localStorage);
                jQuery.each(keys, function (idx, key) {
                    if (startsWith(key, squiffy.story.id)) {
                        localStorage.removeItem(key);
                    }
                });
            }
            else {
                squiffy.storageFallback = {};
            }
            if (squiffy.ui.settings.scroll === 'element') {
                squiffy.ui.output.html('');
                squiffy.story.begin();
            }
            else {
                location.reload();
            }
        };
    
        squiffy.story.save = function() {
            squiffy.set('_output', squiffy.ui.output.html());
        };
    
        squiffy.story.load = function() {
            var output = squiffy.get('_output');
            if (!output) return false;
            squiffy.ui.output.html(output);
            currentSection = jQuery('#' + squiffy.get('_output-section'));
            squiffy.story.section = squiffy.story.sections[squiffy.get('_section')];
            var transition = squiffy.get('_transition');
            if (transition) {
                eval('(' + transition + ')()');
            }
            return true;
        };
    
        var setSeen = function(sectionName) {
            var seenSections = squiffy.get('_seen_sections');
            if (!seenSections) seenSections = [];
            if (seenSections.indexOf(sectionName) == -1) {
                seenSections.push(sectionName);
                squiffy.set('_seen_sections', seenSections);
            }
        };
    
        squiffy.story.seen = function(sectionName) {
            var seenSections = squiffy.get('_seen_sections');
            if (!seenSections) return false;
            return (seenSections.indexOf(sectionName) > -1);
        };
        
        squiffy.ui = {};
    
        var currentSection = null;
        var screenIsClear = true;
        var scrollPosition = 0;
    
        var newSection = function() {
            if (currentSection) {
                disableLink(jQuery('.squiffy-link', currentSection));
            }
            var sectionCount = squiffy.get('_section-count') + 1;
            squiffy.set('_section-count', sectionCount);
            var id = 'squiffy-section-' + sectionCount;
            currentSection = jQuery('<div/>', {
                id: id,
            }).appendTo(squiffy.ui.output);
            squiffy.set('_output-section', id);
        };
    
        squiffy.ui.write = function(text) {
            screenIsClear = false;
            scrollPosition = squiffy.ui.output.height();
            currentSection.append(jQuery('<div/>').html(squiffy.ui.processText(text)));
            squiffy.ui.scrollToEnd();
        };
    
        squiffy.ui.clearScreen = function() {
            squiffy.ui.output.html('');
            screenIsClear = true;
            newSection();
        };
    
        squiffy.ui.scrollToEnd = function() {
            var scrollTo, currentScrollTop, distance, duration;
            if (squiffy.ui.settings.scroll === 'element') {
                scrollTo = squiffy.ui.output[0].scrollHeight - squiffy.ui.output.height();
                currentScrollTop = squiffy.ui.output.scrollTop();
                if (scrollTo > currentScrollTop) {
                    distance = scrollTo - currentScrollTop;
                    duration = distance / 0.4;
                    squiffy.ui.output.stop().animate({ scrollTop: scrollTo }, duration);
                }
            }
            else {
                scrollTo = scrollPosition;
                currentScrollTop = Math.max(jQuery('body').scrollTop(), jQuery('html').scrollTop());
                if (scrollTo > currentScrollTop) {
                    var maxScrollTop = jQuery(document).height() - jQuery(window).height();
                    if (scrollTo > maxScrollTop) scrollTo = maxScrollTop;
                    distance = scrollTo - currentScrollTop;
                    duration = distance / 0.5;
                    jQuery('body,html').stop().animate({ scrollTop: scrollTo }, duration);
                }
            }
        };
    
        squiffy.ui.processText = function(text) {
            function process(text, data) {
                var containsUnprocessedSection = false;
                var open = text.indexOf('{');
                var close;
                
                if (open > -1) {
                    var nestCount = 1;
                    var searchStart = open + 1;
                    var finished = false;
                 
                    while (!finished) {
                        var nextOpen = text.indexOf('{', searchStart);
                        var nextClose = text.indexOf('}', searchStart);
             
                        if (nextClose > -1) {
                            if (nextOpen > -1 && nextOpen < nextClose) {
                                nestCount++;
                                searchStart = nextOpen + 1;
                            }
                            else {
                                nestCount--;
                                searchStart = nextClose + 1;
                                if (nestCount === 0) {
                                    close = nextClose;
                                    containsUnprocessedSection = true;
                                    finished = true;
                                }
                            }
                        }
                        else {
                            finished = true;
                        }
                    }
                }
                
                if (containsUnprocessedSection) {
                    var section = text.substring(open + 1, close);
                    var value = processTextCommand(section, data);
                    text = text.substring(0, open) + value + process(text.substring(close + 1), data);
                }
                
                return (text);
            }
    
            function processTextCommand(text, data) {
                if (startsWith(text, 'if ')) {
                    return processTextCommand_If(text, data);
                }
                else if (startsWith(text, 'else:')) {
                    return processTextCommand_Else(text, data);
                }
                else if (startsWith(text, 'label:')) {
                    return processTextCommand_Label(text, data);
                }
                else if (/^rotate[: ]/.test(text)) {
                    return processTextCommand_Rotate('rotate', text, data);
                }
                else if (/^sequence[: ]/.test(text)) {
                    return processTextCommand_Rotate('sequence', text, data);   
                }
                else if (text in squiffy.story.section.passages) {
                    return process(squiffy.story.section.passages[text].text, data);
                }
                else if (text in squiffy.story.sections) {
                    return process(squiffy.story.sections[text].text, data);
                }
                else if (startsWith(text,'@') && !startsWith(text,'@replace')) {
                    processAttributes(text.substring(1).split(","));
                    return "";
                }
                return squiffy.get(text);
            }
    
            function processTextCommand_If(section, data) {
                var command = section.substring(3);
                var colon = command.indexOf(':');
                if (colon == -1) {
                    return ('{if ' + command + '}');
                }
    
                var text = command.substring(colon + 1);
                var condition = command.substring(0, colon);
                condition = condition.replace("<", "&lt;");
                var operatorRegex = /([\w ]*)(=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)(.*)/;
                var match = operatorRegex.exec(condition);
    
                var result = false;
    
                if (match) {
                    var lhs = squiffy.get(match[1]);
                    var op = match[2];
                    var rhs = match[3];
    
                    if(startsWith(rhs,'@')) rhs=squiffy.get(rhs.substring(1));
                    
                    if (op == '=' && lhs == rhs) result = true;
                    if (op == '&lt;&gt;' && lhs != rhs) result = true;
                    if (op == '&gt;' && lhs > rhs) result = true;
                    if (op == '&lt;' && lhs < rhs) result = true;
                    if (op == '&gt;=' && lhs >= rhs) result = true;
                    if (op == '&lt;=' && lhs <= rhs) result = true;
                }
                else {
                    var checkValue = true;
                    if (startsWith(condition, 'not ')) {
                        condition = condition.substring(4);
                        checkValue = false;
                    }
    
                    if (startsWith(condition, 'seen ')) {
                        result = (squiffy.story.seen(condition.substring(5)) == checkValue);
                    }
                    else {
                        var value = squiffy.get(condition);
                        if (value === null) value = false;
                        result = (value == checkValue);
                    }
                }
    
                var textResult = result ? process(text, data) : '';
    
                data.lastIf = result;
                return textResult;
            }
    
            function processTextCommand_Else(section, data) {
                if (!('lastIf' in data) || data.lastIf) return '';
                var text = section.substring(5);
                return process(text, data);
            }
    
            function processTextCommand_Label(section, data) {
                var command = section.substring(6);
                var eq = command.indexOf('=');
                if (eq == -1) {
                    return ('{label:' + command + '}');
                }
    
                var text = command.substring(eq + 1);
                var label = command.substring(0, eq);
    
                return '<span class="squiffy-label-' + label + '">' + process(text, data) + '</span>';
            }
    
            function processTextCommand_Rotate(type, section, data) {
                var options;
                var attribute = '';
                if (section.substring(type.length, type.length + 1) == ' ') {
                    var colon = section.indexOf(':');
                    if (colon == -1) {
                        return '{' + section + '}';
                    }
                    options = section.substring(colon + 1);
                    attribute = section.substring(type.length + 1, colon);
                }
                else {
                    options = section.substring(type.length + 1);
                }
                var rotation = rotate(options.replace(/"/g, '&quot;').replace(/'/g, '&#39;'));
                if (attribute) {
                    squiffy.set(attribute, rotation[0]);
                }
                return '<a class="squiffy-link" data-' + type + '="' + rotation[1] + '" data-attribute="' + attribute + '" role="link">' + rotation[0] + '</a>';
            }
    
            var data = {
                fulltext: text
            };
            return process(text, data);
        };
    
        squiffy.ui.transition = function(f) {
            squiffy.set('_transition', f.toString());
            f();
        };
    
        squiffy.storageFallback = {};
    
        squiffy.set = function(attribute, value) {
            if (typeof value === 'undefined') value = true;
            if (squiffy.ui.settings.persist && window.localStorage) {
                localStorage[squiffy.story.id + '-' + attribute] = JSON.stringify(value);
            }
            else {
                squiffy.storageFallback[attribute] = JSON.stringify(value);
            }
            squiffy.ui.settings.onSet(attribute, value);
        };
    
        squiffy.get = function(attribute) {
            var result;
            if (squiffy.ui.settings.persist && window.localStorage) {
                result = localStorage[squiffy.story.id + '-' + attribute];
            }
            else {
                result = squiffy.storageFallback[attribute];
            }
            if (!result) return null;
            return JSON.parse(result);
        };
    
        var startsWith = function(string, prefix) {
            return string.substring(0, prefix.length) === prefix;
        };
    
        var rotate = function(options, current) {
            var colon = options.indexOf(':');
            if (colon == -1) {
                return [options, current];
            }
            var next = options.substring(0, colon);
            var remaining = options.substring(colon + 1);
            if (current) remaining += ':' + current;
            return [next, remaining];
        };
    
        var methods = {
            init: function (options) {
                var settings = jQuery.extend({
                    scroll: 'body',
                    persist: true,
                    restartPrompt: true,
                    onSet: function (attribute, value) {}
                }, options);
    
                squiffy.ui.output = this;
                squiffy.ui.restart = jQuery(settings.restart);
                squiffy.ui.settings = settings;
    
                if (settings.scroll === 'element') {
                    squiffy.ui.output.css('overflow-y', 'auto');
                }
    
                initLinkHandler();
                squiffy.story.begin();
                
                return this;
            },
            get: function (attribute) {
                return squiffy.get(attribute);
            },
            set: function (attribute, value) {
                squiffy.set(attribute, value);
            },
            restart: function () {
                if (!squiffy.ui.settings.restartPrompt || confirm('Are you sure you want to restart?')) {
                    squiffy.story.restart();
                }
            }
        };
    
        jQuery.fn.squiffy = function (methodOrOptions) {
            if (methods[methodOrOptions]) {
                return methods[methodOrOptions]
                    .apply(this, Array.prototype.slice.call(arguments, 1));
            }
            else if (typeof methodOrOptions === 'object' || ! methodOrOptions) {
                return methods.init.apply(this, arguments);
            } else {
                jQuery.error('Method ' +  methodOrOptions + ' does not exist');
            }
        };
    })();
    
    var get = squiffy.get;
    var set = squiffy.set;
    
    
    squiffy.story.start = '_default';
    squiffy.story.id = 'f34ba17208';
    squiffy.story.sections = {
        '_default': {
            'text': "<p>@DFS quest</p>\n<p>Nous sommes en septembre 2019, la rentrée commence, vous avez réussi a obtenir un financement Pole Emploi à la dernière seconde après un parcours du combattant, tout s&#39;est joué à la dernière seconde en effet votre conseillère/conseiller n’était pas une flèche, mais bon tout est bien qui finit bien et c&#39;est ce qui compte</p>\n<p>Vous voila devant le campus du Numérique à Confluence, il est beau ça vend du rêve, vous allez commencer un cursus de développeur web et mobile, diplômant de niveau BAC + 2 de septembre à mars , trop la classe !!! Devant le campus une jeune femme en minijupe fume sa cigarette avec frenesie et pres de la route un jeune homme avec une fine moustache mange une pomme adossé a une Ferrari rouge.</p>\n<p>Si vous decidez d&#39;entrer dans le campus <a class=\"squiffy-link link-section\" data-section=\"page1\" role=\"link\" tabindex=\"0\">page1</a>. \nVous preferez vous griller une petite clope seul de votre coté <a class=\"squiffy-link link-section\" data-section=\"page2\" role=\"link\" tabindex=\"0\">page2</a>\nSi vous preferez rentrer chez vous car ca vous gonfle ces conneries de dev web y a League of Legends qui vous attend <a class=\"squiffy-link link-section\" data-section=\"page666\" role=\"link\" tabindex=\"0\">page666</a>\nSi vous decidez d&#39;aborder la jeune femme <a class=\"squiffy-link link-section\" data-section=\"page302\" role=\"link\" tabindex=\"0\">page302</a>\nVous allez vous ce richard a la Ferrari <a class=\"squiffy-link link-section\" data-section=\"page555\" role=\"link\" tabindex=\"0\">page555</a></p>",
            'passages': {
            },
        },
        'page2': {
            'text': "<p>Vous vous dites que vous avez encore un peu de temps devant vous, vous sortez votre feuille à rouler, tabac et votre filtre pour vous faire votre cigarette, et vous vous rendez compte que la buraliste à Suchet vous a donnée des filtres trop long. La galère...</p>\n<p>&quot;Bordel, la morue, elle m&#39;a refilée ses filtres pourris, c&#39;est pas ceux la que je voulais ils sont trop longs !!!&quot;</p>\n<p>Enervé vous decidez:\nD&#39;aller au bureau tabac parce qu&#39;on se fout pas de votre gueule <a class=\"squiffy-link link-section\" data-section=\"page3\" role=\"link\" tabindex=\"0\">page3</a>\nD&#39;entrer dans le campus <a class=\"squiffy-link link-section\" data-section=\"page1\" role=\"link\" tabindex=\"0\">page1</a>\nDe fumer quand meme cette clope malgré les filtres <a class=\"squiffy-link link-section\" data-section=\"page4\" role=\"link\" tabindex=\"0\">page4</a></p>",
            'passages': {
            },
        },
        'page3': {
            'text': "<p>Tout essoufflé et en colère vous arrivez devant le bureau tabac à Suchet, vous entrez en trombe dans la boutique et vous balancez le paquet de filtres dans la tete de la buraliste en la traitant d&#39;arnaqueuse et de tous les noms possibles, elle se réfugie dans l’arrière boutique. Toujours en colère et loin d&#39;en avoir fini avec elle vous décidez de rester à l&#39;attendre et 5 minutes plus tard vous entendez une sirène de Police, 2 agents musclés entrent dans le bureau tabac et s’emparent de vous. Vous les insultez, vous vous débattez mais en vain.</p>\n<p>Vous finissez au poste pour menaces et outrage à agent. Tant pis pour la journée d’intégration à l&#39;IT mais faut pas se foutre de votre gueule avec les filtres à tabac.</p>",
            'passages': {
            },
        },
        'page4': {
            'text': "<p>Vous fumez ce bon vieux tabac malgré le filtre trop long.</p>\n<p>Ca fait du bien, inspirer cette fumée vous revigore. </p>\n<p>Vous décidez:\nD&#39;entrer dans le campus <a class=\"squiffy-link link-section\" data-section=\"page1\" role=\"link\" tabindex=\"0\">page1</a>\nD&#39;en refumer une autre car c&#39;est vachement bon <a class=\"squiffy-link link-section\" data-section=\"page5\" role=\"link\" tabindex=\"0\">page5</a></p>",
            'passages': {
            },
        },
        'page5': {
            'text': "<p>Vous en avez pas assez, le tabac c&#39;est bon, c&#39;est sain et faut pas s&#39;en priver, le tabac c&#39;est la vie donc vous décidez d&#39;en refumer quelques autres.</p>\n<p>Vous decidez:\nVous ne faites que commencer, encore une clope <a class=\"squiffy-link link-section\" data-section=\"page6\" role=\"link\" tabindex=\"0\">page6</a>\nBon ca suffit faut quand meme y aller a cette journée d&#39;integration <a class=\"squiffy-link link-section\" data-section=\"page1\" role=\"link\" tabindex=\"0\">page1</a></p>",
            'passages': {
            },
        },
        'page6': {
            'text': "<p>Vous ne pouvez plus vous arrêter, c&#39;est tellement bon, vous ne voyez pas le temps passer, vous enchaînez clope après clope, soudain le soir tombe, vous ne vous sentez plus très bien, vous commencez à tousser, votre vue devient flou et vous tombez par terre. Vous entendez les sirenes des pompiers qui viennent vous ramasser.</p>\n<p>Pour la rentrée on attendra, direction cure de desitox.</p>",
            'passages': {
            },
        },
        'page1': {
            'text': "<p>Vous passez la porte d&#39;entrée, devant vous un super hall d&#39;entrée tres propre avec une maquette au centre et un poste de securité à droite, on ne fait pas les choses à moitié ici, on voit ou passe l&#39;argent de la region vous vous dites. Sur un des bancs se trouve un gugusse avec un tatouage N7 il a l&#39;air de vous attendre. Un panneau se trouve contre le mur &quot;Developpeur Web et Mobile Journée d&#39;integration au 1 er etage&quot;. Bien il va falloir monter, vous voyez un ascenseur et un escalier.</p>\n<p>Vous prenez l&#39;escalier <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a>\nVous montez dans l&#39;ascenseur parce que monter un étage faut pas deconner non plus <a class=\"squiffy-link link-section\" data-section=\"page8\" role=\"link\" tabindex=\"0\">page8</a>\nSi vous allez voir le mec chelou avec le tatouage N7 <a class=\"squiffy-link link-section\" data-section=\"page99\" role=\"link\" tabindex=\"0\">page99</a></p>",
            'passages': {
            },
        },
        'page99': {
            'text': "<p>Il vous salue et vous annonce qu&#39;il s&#39;appele Lucas, &quot;Ce que je vais te dire va te paraitre etrange mais ecoutes moi bien, tu es dans mon jeu que j&#39;ai crée, je suis le maitre de ce jeu appelé DFS Quest, tu es le personnage principal et ton but est d&#39;arriver dans la salle DWM sans etre tenté par tous les personnages que tu risques de croiser qui vont te detourner de ton but. Je suis la pour t&#39;avertir&quot;.\nOk il a definitivement pas l&#39;air net celui la, de mieux en mieux vous vous dites.</p>\n<p>Si vous n&#39;avez pas le temps de perdre votre temps avec un fou prenez l&#39;escalier <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a> ou l&#39;ascenseur <a class=\"squiffy-link link-section\" data-section=\"page8\" role=\"link\" tabindex=\"0\">page8</a>\nIl ne faut pas laisser un fou en liberté par les temps qui courent, vous appelez l&#39;asile le plus proche <a class=\"squiffy-link link-section\" data-section=\"page177\" role=\"link\" tabindex=\"0\">page177</a></p>",
            'passages': {
            },
        },
        'page177': {
            'text': "<p>Des hommes en blancs arrivent rapidement et empoignent le fou, il continue de crier que c&#39;est son jeu et que vous n&#39;avez pas le droit de faire ca, vous assistez au spectacle pendant que les infirmiers l&#39;embarquent. Bon debarras, VOUS etre dans un jeu ? La bonne blague. Bon direction la salle de classe.</p>\n<p>Vous prenez l&#39;escalier <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a>\nVous montez dans l&#39;ascenseur parce que monter un étage faut pas deconner non plus <a class=\"squiffy-link link-section\" data-section=\"page8\" role=\"link\" tabindex=\"0\">page8</a></p>",
            'passages': {
            },
        },
        'page8': {
            'text': "<p>Vous entrez dans l&#39;ascenseur, une fille s&#39;y trouve, de type oriental avec des lunettes en train d&#39;ecouter de la musique. 3 etages s&#39;offrent à vous.</p>\n<p>Vous decidez d&#39;engager la discussion <a class=\"squiffy-link link-section\" data-section=\"page9\" role=\"link\" tabindex=\"0\">page9</a>\nVous montez au 1 er <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a>\nVous montez au 2 eme <a class=\"squiffy-link link-section\" data-section=\"page10\" role=\"link\" tabindex=\"0\">page10</a>\nVous montez au 3 eme <a class=\"squiffy-link link-section\" data-section=\"page11\" role=\"link\" tabindex=\"0\">page11</a></p>",
            'passages': {
            },
        },
        'page9': {
            'text': "<p>&quot;Bonjour excuse moi de te deranger&quot;, la fille ne réagit pas absorbée dans sa musique une sorte de Pop, vous l&#39;interpellez à nouveau &quot;Euh ? Excuse moi ?&quot;, mais toujours rien aucune réaction.</p>\n<p>Vous decidez de lui toucher l&#39;épaule <a class=\"squiffy-link link-section\" data-section=\"page12\" role=\"link\" tabindex=\"0\">page12</a>\nTant pis vous montez au 1 er <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a>\nTant pis vous montez au 2 eme <a class=\"squiffy-link link-section\" data-section=\"page10\" role=\"link\" tabindex=\"0\">page10</a>\nTant pis vous montez au 3 eme <a class=\"squiffy-link link-section\" data-section=\"page11\" role=\"link\" tabindex=\"0\">page11</a></p>",
            'passages': {
            },
        },
        'page12': {
            'text': "<p>Vous tendez votre bras et la secouez doucement par l&#39;epaule. Grosse erreur, elle vous attrappe par le bras et vous fais une prise de judo et vous envois contre le mur de l&#39;ascenseur, vous tombez dans les pommes, juste avant de vous évanouir vous entendez la fille dire &quot;Personne ne touche, Norhen&quot;. Vous vous reveillez au poste de securité, il est deja 20h, la journée d&#39;integration repassera.</p>",
            'passages': {
            },
        },
        'page7': {
            'text': "<p>Vous arrivez au 1 er etage, un petit hall avec des fauteuils devant vous, sur un fauteuil est assis un homme barbu, il tient une plaquette d&#39;information de l&#39;IT et semble fort preoccupé.\nA votre droite une porte et une autre à votre gauche et une autre derriere vous.</p>\n<p>Vous decidez d&#39;aborder l&#39;homme barbu <a class=\"squiffy-link link-section\" data-section=\"page144\" role=\"link\" tabindex=\"0\">page144</a>\nVous prenez la porte derriere vous <a class=\"squiffy-link link-section\" data-section=\"page15\" role=\"link\" tabindex=\"0\">page15</a>\nVous prenez la porte de droite <a class=\"squiffy-link link-section\" data-section=\"page16\" role=\"link\" tabindex=\"0\">page16</a>\nVous prenez la porte de gauche <a class=\"squiffy-link link-section\" data-section=\"page17\" role=\"link\" tabindex=\"0\">page17</a></p>",
            'passages': {
            },
        },
        'page144': {
            'text': "<p>Vous lui lancez un &quot;Bonjour ca va ? Vous semblez preoccupé, vous etes ici pour le Dev Web ?&quot;&quot;, il vous repond qu&#39;il est là comme vous pour le Dev Web et Mobile, il s&#39;appele Said, mais qu&#39;il est choqué car il vient d&#39;apprendre que la formation est non diplomante et qu&#39;il ne veut pas tricher, apres mure reflexion il vous annnonce d&#39;un air grave qu&#39;il va arreter.</p>\n<p>Il fait ce qu&#39;il veut apres tout et vous prenez la porte de droite <a class=\"squiffy-link link-section\" data-section=\"page16\" role=\"link\" tabindex=\"0\">page16</a>\nCelle de gauche <a class=\"squiffy-link link-section\" data-section=\"page17\" role=\"link\" tabindex=\"0\">page17</a>\nCelle qui est derriere <a class=\"squiffy-link link-section\" data-section=\"page15\" role=\"link\" tabindex=\"0\">page15</a>\nVous decidez d&#39;arreter la formation et d&#39;aller postuler chez Human Booster avec votre nouvel ami Said <a class=\"squiffy-link link-section\" data-section=\"page200\" role=\"link\" tabindex=\"0\">page200</a></p>",
            'passages': {
            },
        },
        'page200': {
            'text': "<p>L&#39;aventure de l&#39;IT Akademy prend fin avant même d&#39;avoir commencée, mais une nouvelle aventure commence, de plus vous avez gagné un nouvel compagnon de route le brave Said avec qui vous comptez postuler chez Human Booster. Bonne chance à vous !!!</p>",
            'passages': {
            },
        },
        'page10': {
            'text': "<p>Vous arrivez au 2 eme etage et vous tombez sur Sébastien Poiré qui vous dit les yeux dans les yeux que la journée d&#39;integration c&#39;est pas au 2 eme que cela se passe mais au 1 er, il vous invite donc à redescendre.</p>\n<p>Vous lui faites confiance <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a></p>",
            'passages': {
            },
        },
        'page11': {
            'text': "<p>Vous voila au 3 eme, bienvenu à la 101 vous dit un hipster barbu en slips, vous tournez votre regard et vous constatez qu&#39;il y a des sacs de couchage par terre, à votre droite une tente est même plantée là avec des bruits etranges dedans, vous ne voulez pas en savoir plus, vous continuez d&#39;avancer et vous voyez une fille à moitie endormie en train de se brosser les dents, une autre dort sur un fauteuil, plus loin un gars prends son petit dej, un autre cuisine du poulet sur des plaques electriques portables, de la fumée ressemblant à du cannabis s&#39;echappe de sous la porte des WC, vous vous demandez si vous etes toujours dans le Campus du Numerique ou si le 3 eme étage débouche sur un monde parallel.</p>\n<p>Le hipster barbu revient vers vous et vous explique ce qui se passe, c&#39;est la 101 une ecole un peu spéciale et vous fait un speech pour vous inciter à les rejoindre car c&#39;est vachement fun l&#39;autonomie.</p>\n<p>Vous voulez vous aussi devenir un hipster geek qui passe ses journées sur l&#39;ordi et qui se lave pas, vous decidez de les rejoindre <a class=\"squiffy-link link-section\" data-section=\"page300\" role=\"link\" tabindex=\"0\">page300</a>\nUne piscine de 1 mois ? Faut pas vous prendre pour un con, vous prenez congé de ces ames perdues et allez directement au 1 er etage <a class=\"squiffy-link link-section\" data-section=\"page7\" role=\"link\" tabindex=\"0\">page7</a> ou au 2 eme <a class=\"squiffy-link link-section\" data-section=\"page10\" role=\"link\" tabindex=\"0\">page10</a></p>",
            'passages': {
            },
        },
        'page300': {
            'text': "<p>Vous revenez le lendemain avec votre sac de couchage et vos cannettes de Red Bull pour devenir vous aussi un zombie et travailler gratuitement pendant 1 mois peut etre pour rien, car être exploité ça a du bon quand meme, bonne chance car vous en aurez besoin.</p>",
            'passages': {
            },
        },
        'page15': {
            'text': "<p>Vous arrivez dans une salle à manger avec 2 distributeurs et pleins de tables, sur une des tables se trouve une tasse de thé avec une infusion qui sent bon et dégage de la fumée, un jeune homme se trouve devant le distributeur à café, il se presente il s&#39;appele Adam, il est la aussi pour le Developpeur Web et Mobile, il vous dit que c&#39;est la dèche et que vous seriez bien gentil de le dépanner pour un café mais aussi des madeleines.</p>\n<p>Il se demerde c&#39;est pas votre problème, vous prenez la porte au fond à gauche des machines <a class=\"squiffy-link link-section\" data-section=\"page16\" role=\"link\" tabindex=\"0\">page16</a>\nVous lui donnez tout votre argent qui vous reste car il a l&#39;air sympa puis vous sortez par la porte de gauche <a class=\"squiffy-link link-section\" data-section=\"page16\" role=\"link\" tabindex=\"0\">page16</a>\nVous buvez l&#39;infusion mysterieuse <a class=\"squiffy-link link-section\" data-section=\"page312\" role=\"link\" tabindex=\"0\">page312</a></p>",
            'passages': {
            },
        },
        'page312': {
            'text': "<p>Vous avez bu l&#39;infusion d&#39;Elizabeth, elle vous revigore et restaure vos PV, néanmoins si elle l&#39;apprend ca va chier pour vous. Adam revient vers vous et revient à la charge en mode relou &quot;Stp j&#39;ai vraiment envie d&#39;un café la et d&#39;un paquet de madeleines, tu me depannes&quot; ?</p>\n<p>Il se demerde c&#39;est pas votre problème, vous prenez la porte au fond à gauche des machines <a class=\"squiffy-link link-section\" data-section=\"page16\" role=\"link\" tabindex=\"0\">page16</a>\nVous lui donnez tout votre argent qui vous reste car il a l&#39;air sympa puis vous sortez par la porte de gauche <a class=\"squiffy-link link-section\" data-section=\"page16\" role=\"link\" tabindex=\"0\">page16</a></p>",
            'passages': {
            },
        },
        'page16': {
            'text': "<p>Vous vous trouvez maintenant dans un long couloir avec plein de sièges et un baby-foot plusieurs salles de cours à droite mais aussi un un bureau administratif. Dans le couloir se trouve une petite fille asiatique toute mimi qui tient un plateau de gateaux arabes suintant le gras et le miel elle les distribue à ceux qui en veulent, mais aussi un grand barbu mysterieux avec des lunettes, il boit un café. La salle des DWM se trouve ici aussi.\nPrés des fenetres un robot sur des roues avec un ecran en haut dans lequel se trouve un chat. Assis à une table se trouve un homme barbu avec un t-shirt de Batman en train de coder. &quot;Serieux y a que des barbus ici ou quoi ?&quot; vous vous dites.</p>\n<p>Direction la salle DWM pour l&#39;integration <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nAllons voir ce barbu aux lunettes si intriguant <a class=\"squiffy-link link-section\" data-section=\"page56\" role=\"link\" tabindex=\"0\">page56</a>\nVous avez des questions d&#39;ordre administratif, allez prendre des infos au bureau auprès de Lucie <a class=\"squiffy-link link-section\" data-section=\"page46\" role=\"link\" tabindex=\"0\">page46</a>\nVous decidez d&#39;aller demander au chat si il fait parti de la promotion <a class=\"squiffy-link link-section\" data-section=\"page554\" role=\"link\" tabindex=\"0\">page554</a>\nVous allez voir le gars barbu au t-shirt Batman qui code <a class=\"squiffy-link link-section\" data-section=\"page111\" role=\"link\" tabindex=\"0\">page111</a>\nSi vous allez voir la fille asiatique toute mimi <a class=\"squiffy-link link-section\" data-section=\"page211\" role=\"link\" tabindex=\"0\">page211</a></p>",
            'passages': {
            },
        },
        'page111': {
            'text': "<p>Vous tentez de lui parler mais il est trop absorbé dans son code, vous jetez un oeil à son écran et il est en train de coder un jeu de cartes, ca a l&#39;air vachement bien foutu, le mec à l&#39;air de gerer, vous tentez de lui reparler mais rien n&#39;y fait, seul le code compte pour lui il est comme coupé du monde. vous tentez une derniere fois mais c&#39;est peine perdu, il ne réagit a aucun signe exterieur. Tant pis, son t-shirt Killing Joke est pas mal n&#39;empeche. Vous vous retournez vers le couloir.</p>\n<p>Direction la salle DWM pour l&#39;integration <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nAllons voir ce barbu aux lunettes si intriguant <a class=\"squiffy-link link-section\" data-section=\"page56\" role=\"link\" tabindex=\"0\">page56</a>\nVous avez des questions d&#39;ordre administratif, allez prendre des infos au bureau aupres de Lucie <a class=\"squiffy-link link-section\" data-section=\"page46\" role=\"link\" tabindex=\"0\">page46</a>\nVous decidez d&#39;aller demander au chat si il fait parti de la promotion <a class=\"squiffy-link link-section\" data-section=\"page554\" role=\"link\" tabindex=\"0\">page554</a>\nSi vous allez voir la fille asiatique toute mimi <a class=\"squiffy-link link-section\" data-section=\"page211\" role=\"link\" tabindex=\"0\">page211</a></p>",
            'passages': {
            },
        },
        'page211': {
            'text': "<p>Cette petite chose toute mimi s&#39;appele Lasmy, elle est en DWM elle aussi, vient du Laos et adore manger, elle vous propose des gâteaux elle vous dit qu&#39;ils sont trop bons, le miel degouline de toutes parts.</p>\n<p>Vous vous jetez sur le plat et commencez à déguster ces petits gateaux <a class=\"squiffy-link link-section\" data-section=\"page937\" role=\"link\" tabindex=\"0\">page937</a>\nL&#39;assiette vous donne mal au coeur, vous vous enfuyez en salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a></p>",
            'passages': {
            },
        },
        'page937': {
            'text': "<p>Vous commencez à manger les gateaux, les uns apres les autres, le miel et le sucre vous degouline sur les mains, c&#39;est bon, vous en reprenez sous le regard espiegle de Lasmy qui semble contente de vous engraisser tel un poulet. Votre main se pose sur un des gateaux mais soudain une autre main attrape ce même gateau, vous levez votre tête et vous remarquez une jeune femme avec des lunettes, plutot grande, cheveux longs, et du fard à paupières rose, elle vous regarde mechamment, un air d&#39;Inquisition, son regard vous intime de lacher le gateau et de dégager de la, elle marque clairement son territoire, le festin est fini et le sien commence, devant une telle demonstration de force vous avez le choix de:</p>\n<p>Lacher le gâteau au miel et vous enfuir dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nMais aussi de lacher le gateau au miel et vous enfuir dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nVous pouvez aussi lacher le gateau au miel et vous enfuir dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nOu encore de lacher le gateau au miel et vous enfuir dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nEn fait vous vous rendez compte que vous ne pouvez pas resister a l&#39;appetit sans limites de cette jeune et vous lachez le gateau au miel pour vous enfuir dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a></p>",
            'passages': {
            },
        },
        'page46': {
            'text': "<p>Vous voila dans le bureau de Lucie Caffin, vous trouvez une jeune femme assise en habits fashion et avec un piercing au nez en train de parler avec ferveur au telephone, vous lui faites un petit geste amical, elle vous regarde vous sourit et vous fais signe de patienter, la discussion bat son plein, Lucie a plein de choses à dire et manie à merveille la langue de Moliere, ca ne s&#39;arrete pas, c&#39;est loin de s&#39;arreter, loin de loin, Lucie est absorbée dans la conversation, vous allez devoir patienter il semble. 10 minutes passent, Lucie vous jete un regard elle vous fait un clin d&#39;oeil pour vous faire comprendre qu&#39;elle a bien vue que vous êtes la, puis la discussion reprend de plus belle.</p>\n<p>Vous allez devoir patienter <a class=\"squiffy-link link-section\" data-section=\"page613\" role=\"link\" tabindex=\"0\">page613</a></p>",
            'passages': {
            },
        },
        'page613': {
            'text': "<p>La discussion continue de battre son plein, Lucie a plein de choses à dire et manie toujours aussi bien la langue de Moliere, ca ne s&#39;arrete pas, c&#39;est loin de s&#39;arreter, loin de loin, Lucie est absorbée dans la conversation, vous allez devoir patienter il semble. 50 minutes passent, Lucie vous jete un regard elle vous fait un clin d&#39;oeil pour vous faire comprendre qu&#39;elle a bien vue que vous etes la, puis la discussion reprend de plus belle. </p>\n<p>Vous montrez des signes de fatigue mais vous vous accrochez vous voulez ces infos... <a class=\"squiffy-link link-section\" data-section=\"page614\" role=\"link\" tabindex=\"0\">page614</a></p>",
            'passages': {
            },
        },
        'page614': {
            'text': "<p>La discussion est à son point culminant, Lucie a plein de choses à dire et manie à merveille la langue de Moliere, ca ne s&#39;arrete toujours pas, c&#39;est loin de s&#39;arreter, loin de loin, Lucie est absorbée dans la conversation, vous allez devoir patienter il semble. Vous perdez la notion du temps, Lucie vous jete un regard elle vous fait un nouveau clin d&#39;oeil pour vous faire comprendre qu&#39;elle a bien vue que vous etes la, puis la discussion reprend de plus belle. Vous commencez à vacillier, vous voyez trouble, vous consultez votre montre, il est 17h. Lucie vous regarde à nouveau et vous dit enfin &quot;T&#39;en fais bien j&#39;ai bientot fini&quot; et vous fait un clin d&#39;oeil.</p>\n<p>Un dernier effort, vous y mettez toutes vos forces <a class=\"squiffy-link link-section\" data-section=\"page615\" role=\"link\" tabindex=\"0\">page615</a></p>",
            'passages': {
            },
        },
        'page615': {
            'text': "<p>Il est 19h, Lucie raccroche enfin, elle consulte sa montre et vous dit avec le sourire &quot;Je suis desolé ma/mon louloutte/loulou mais la j&#39;ai deja debordée, le telephone ca n&#39;arrete pas ces derniers temps, je finis normalement avant tu sais, la je dois vraiment y aller et Plus Belle la Vie va bientot commencer, j&#39;ai deja raté l&#39;episode d&#39;hier tu te rends compte, pas question d&#39;en louper 2 de suite, les questions tu reviens demain je serais la pour y repondre, allez je file&quot;. Elle eteint la lumiere et s&#39;en va gracieusement. Vous etes la le regard hagard, vous vous trainez jusqu&#39;au fauteuil dans le couloir et laissez tomber dedans votre miserable carcasse. Vous dormez, demain sera un autre jour et vous aurez ces infos, c&#39;est sur !!!</p>",
            'passages': {
            },
        },
        'page56': {
            'text': "<p>Vous interpellez le barbu, il vous regarde et vous dit d&#39;un air calme et posé &quot;Show&quot;... Il vous regarde et attend votre reaction.\nEuh ok ? Vous le prenez pour un fou et vous preferez vous en aller tant qu&#39;il est encore temps dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a>\nVous lui repondez avec classe &quot;Tables;&quot; <a class=\"squiffy-link link-section\" data-section=\"page242\" role=\"link\" tabindex=\"0\">page242</a></p>",
            'passages': {
            },
        },
        'page242': {
            'text': "<p>Il vous sourit et vous fais un signe du pouce en signe d&#39;approbation, il vous fais un signe de la main pour aller fumer dehors.\nSi votre main tremble du manque de nicotine vous suivez votre nouvel ami dehors <a class=\"squiffy-link link-section\" data-section=\"page269\" role=\"link\" tabindex=\"0\">page269</a>\nSi vous preferez aller en salle DWM c&#39;est le moment <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a></p>",
            'passages': {
            },
        },
        'page269': {
            'text': "<p>Vous fumez dehors avec votre nouveau pote Orkun, il vient de Turquie et il adore fumer et boire du café, vous passez votre matinée à fumer et boire du café tout en parlant, il est midi et vous croisez Anto et Jon les 2 formateurs de l&#39;IT Akademy, ils sont jeunes, ils sont sympas, ils aiment Pokémon, ils vous presentent la formation ca à l&#39;air super cool, c&#39;est pas tout mais votre ventre commence à gargouiller, c&#39;est l&#39;heure du repas.\nSi vous allez au Steak and Shake avec Anto et Jon pour discuter de Pokémons et de RPG c&#39;est par là <a class=\"squiffy-link link-section\" data-section=\"page384\" role=\"link\" tabindex=\"0\">page384</a>\nSi vous preferez retourner dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a></p>",
            'passages': {
            },
        },
        'page384': {
            'text': "<p>Anto et Jon sont de vrais experts en Pokemon, en citrons et en carrés magiques, vous buvez leur paroles comme si vous etiez face à des gourous, vous apprenez que ce sont d&#39;anciens DWM, ils sont tels des dieux devant vous, des dieux qui mangent au Steak and Shake tous les jours et qui jouent a Pokemon, car tel est leur privilege, ils sont une inspiration pour vous, cette rencontre vous gonfle à bloc, vous aussi vous deviendrez Full Stack un jour et mangerez tous les jours des Triple Cheese tout en balancant des Pokeballs, vous vous faites cette promesse. \nVous revenez dans la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page444\" role=\"link\" tabindex=\"0\">page444</a></p>",
            'passages': {
            },
        },
        'page444': {
            'text': "<p>Vous arrivez dans la salle mais elle est vide, il est midi c&#39;est normal, vous etes arrivés un peu tard, néanmoins un jeune homme est allongé par terre il porte un t shirt avec une fouine dessus, il semble dormir paisiblement.\nIl a l&#39;air de tellement bien dormir que vous vous mettez à coté de lui pour bien finir cette journée et faire vous aussi une petite sieste <a class=\"squiffy-link link-section\" data-section=\"page987\" role=\"link\" tabindex=\"0\">page987</a></p>",
            'passages': {
            },
        },
        'page554': {
            'text': "<p>Le chat se montre tres éloquant et vous explique qu&#39;en effet il est un éleve de la DWM ou qu&#39;en tout cas il en a remplacée une, il s&#39;appele Gaston et veut s&#39;ameliorer en programmation web, vous passez un long moment à echanger ensembles sur les langages et les questions mechatphysiques Gaston etant un veritable erudit et un autodidacte. Il vous confie un secret en prime: il a eliminé sa maitresse C (il refuse de devoiler son nom) qui devenait trop encombrante, il compte aussi asservir les humains une fois qu&#39;il aura appris la programmation et crée une IA destructrice. Vous lui faites un clin d&#39;oeil malicieux et lui dites que vous en etes et le saluez puis vous prenez congé.</p>\n<p>Vous rejoignez la salle DWM <a class=\"squiffy-link link-section\" data-section=\"page101\" role=\"link\" tabindex=\"0\">page101</a></p>",
            'passages': {
            },
        },
        'page17': {
            'text': "<p>Vous arrivez dans un couloir avec des sieges et plein de salles de cours, vous croisez un homme au crane degarni et des lunettes, tres bien habillé et à l&#39;air fort sympa. Il se presente et s&#39;appele FX, FX vous dit qu&#39;il connait un sujet fort sympa que vous allez adorer si vous avez du temps.</p>\n<p>Vous adorez et vous écoutez FX <a class=\"squiffy-link link-section\" data-section=\"page260\" role=\"link\" tabindex=\"0\">page260</a>\nVous sentez le piège et fillez dans la cafeteria au fond <a class=\"squiffy-link link-section\" data-section=\"page15\" role=\"link\" tabindex=\"0\">page15</a></p>",
            'passages': {
            },
        },
        'page260': {
            'text': "<p>FX aime le Java, il vous en parle, il aime aussi le MySQL en en parle avec passion, beaucoup de passion, FX aime tellement le Java et le MySQL que vous regardez votre montre et vous constatez qu&#39;il et 21h du soir. FX vous salue &quot;Bon je pense que j&#39;en ai un peu trop dit, sur ce je te laisse bonne integration pour le cursus on se reverra surement&quot;. Bon... il est temps de rentrer chez vous, au moins vous avez pas tout perdu vous connaissez le Java maintenant.</p>",
            'passages': {
            },
        },
        'page666': {
            'text': "<p>Vous avez fait une Andiolino et la direction va surement vous convoquer, vous etes dans de beaux draps.</p>",
            'passages': {
            },
        },
        'page987': {
            'text': "<p>Vous vous reveillez, vous vous trouvez dans un monde avec des lutins qui plantent des bananes, des fées qui virvoltent au grés du vent des montagnes de sucres et des volcans qui crachent du caramel au loin, un monde fort etrange soudainement une fouine passe et s&#39;arrete devant vous, elle vous sourit et vous dit bienvenue chez moi. Salut à toi la fouine !!!</p>",
            'passages': {
            },
        },
        'page302': {
            'text': "<p>La jeune femme se presente comme Mme Belardi, prof Belardi pour les intimes, elle donne des cours de Wordpress au Campus, elle vous explique que le Wordpress c&#39;est la vie et qu&#39;il n&#39;y a que ca de vrai et que de toutes maniere toutes les boites de Web font plus que du Wordpress , elle vous baratines pendant 1h en vous expliquant comment changer un fond d&#39;ecran ou encore comment faire du préfabriqué, sa devise moins on en fait mieux on se porte.</p>\n<p>Vous tombez sous le charme de Mme Belardi et vous decidez de tout quitter pour faire du Wordpress, l&#39;avenir <a class=\"squiffy-link link-section\" data-section=\"page624\" role=\"link\" tabindex=\"0\">page624</a>\nVous tomberez pas dans le panneau aussi facilement, vous lui dites que vous etes la pour developper et pas faire du collage, au revoir <a class=\"squiffy-link link-section\" data-section=\"page1\" role=\"link\" tabindex=\"0\">page1</a></p>",
            'passages': {
            },
        },
        'page624': {
            'text': "<p>10 ans plus tard dans un futur lointain.\nVous etes devenus une rockstar du Wordpress, tout le monde vous connait, toutes les boites Web s&#39;arrachent vos services, sous la tutelle de votre mentor Miss Belardi vous avez atteints des sommets, le Wordpress a remporté la guerre, les vrais developpeurs ont disparus tels des dinosaures à l&#39;ere du Cretace frappés par une meteorite nommée Wordpress, vous avez fait le bon choix le choix de la survie, le meilleur de votre vie.</p>",
            'passages': {
            },
        },
        'page1000': {
            'text': "<p>La journée d&#39;integration a pris fin, vous rentrez chez vous, dehors vous vous rendez compte qu&#39;Adam vous a taxé toute votre monnaie avec le café et les madeleines et qu&#39;il ne vous reste plus un rond pour prendre le bus, vous allez devoir rentrer chez vous à pieds. Vie de merde.</p>",
            'passages': {
            },
        },
        'page555': {
            'text': "<p>Il se presente il s&#39;appele Benoit Perus, il est tres sympa et suivra le cursus DWM comme vous, vous lui parlez de sa Ferrari et il vous repond &quot;Oh ca ? C&#39;est rien, c&#39;est juste une Ferrari, je suis Suisse tu sais et la bas c&#39;est un equipement standard, c&#39;est juste un outil de la vie de tous les jours assez banal, c&#39;est le privilege d&#39;etre Suisse ca entre autres choses comme mon manoir secondaire, la a Lyon je loge au Hilton le temps de la formation&quot;, vous blablatez quelques minutes et il vous propose de vous raccompagner chez vous en Ferrari à la fin de la journée, vous acceptez. Vous le saluez et revenez devant le campus.</p>\n<p>Si vous decidez d&#39;entrer dans le campus <a class=\"squiffy-link link-section\" data-section=\"page1\" role=\"link\" tabindex=\"0\">page1</a>. \nVous preferez vous griller une petite clope seul de votre coté <a class=\"squiffy-link link-section\" data-section=\"page2\" role=\"link\" tabindex=\"0\">page2</a>\nSi vous preferez rentrer chez vous car ca vous gonfle ces conneries de dev web y a League of Legends qui vous attend <a class=\"squiffy-link link-section\" data-section=\"page666\" role=\"link\" tabindex=\"0\">page666</a>\nSi vous decidez d&#39;aborder la jeune femme en minijupe qui est devant et qui fume <a class=\"squiffy-link link-section\" data-section=\"page302\" role=\"link\" tabindex=\"0\">page302</a></p>",
            'passages': {
            },
        },
        'page101': {
            'text': "<p>Vous avez enfin reussi à atteindre la salle de classe malgrés toutes les tentations, toutes les embuches sur votre chemin, votre force de volonté a été plus forte, vous vous installez sur une chaise, confiant en votre force pour devenir un veritable Full Stack, vous redardez les gens autour de vous, ca à l&#39;air d&#39;etre une bonne promo, Lucie commence à parler sans plus pouvoir s&#39;arreter, l&#39;atmosphere est bonne, toutes les conditions sont reunies, vous relevez la tete, vous regardez le tableau, une rayon de lumiere percant traverse la vitre, il illumine la salle, vous souriez.</p>\n<p>A SUIVRE DANS NOTRE PROCHAIN OPUS: DFS QUEST 2 &quot;LES GALERES COMMENCENT&quot; ET LES FUTURES EXTENSIONS &quot;LE PHP C&#39;EST DIABOLIQUE&quot; ou encore &quot;LE JAVA SCRIPT DONNE DES MIGRAINES&quot;.\n(Et n&#39;oubliez pas nos DLC à 20 Euros piece bientot disponibles pour DFS QUEST 1 ainsi que notre Season Pass pour la modique somme de 100 Euros qui contiendra des wallpapers, des avatars et passages exclusifs le tout incroyablement excitants parce que c&#39;est nous qui le faison et que de toute facon vous etes des moutons et vous acheterez quoi qu&#39;il arrive nos jeux).</p>\n<p>PS: si vous avez donnés votre argent à Adam dans la cefeteria, rendez vous ici <a class=\"squiffy-link link-section\" data-section=\"page1000\" role=\"link\" tabindex=\"0\">page1000</a>\nPS: Si vous avez parlés à Benoit il vous ramene chez vous en Ferrari</p>",
            'passages': {
            },
        },
    }
    })();