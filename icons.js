/* まなびの基板 — アイコン。manage.html の選択肢もここから作られます */
(function (global) {
  var P = {
    bolt:   '<path d="M13.5 2.5 5.5 13.5h5l-1 8 8-11h-5z"/>',
    letters:'<path d="M3.5 18 7.5 6.5 11.5 18M4.9 14.4h5.2M20.5 18v-5.5a3 3 0 0 0-6 0V18M14.5 15h6"/>',
    maze:   '<path d="M3.5 3.5h17v17h-17zM7.5 20.5V7.5h9v9h-5"/>',
    map:    '<path d="M9 4.2 3.5 6.3v13.5L9 17.7l6 2.1 5.5-2.1V4.2L15 6.3zM9 4.2v13.5M15 6.3v13.5"/>',
    flask:  '<path d="M10 3.2v6.3l-5.6 9.1a1.8 1.8 0 0 0 1.5 2.7h12.2a1.8 1.8 0 0 0 1.5-2.7L14 9.5V3.2M8.6 3.2h6.8M7 15h10"/>',
    book:   '<path d="M4 4.6h6.5a2 2 0 0 1 2 2V20a1.8 1.8 0 0 0-1.6-1.4H4zM20 4.6h-5.5a2 2 0 0 0-2 2V20a1.8 1.8 0 0 1 1.6-1.4H20z"/>',
    pen:    '<path d="M4 20h4.2L20.2 8a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8zM15.5 5.5l3 3"/>',
    globe:  '<circle cx="12" cy="12" r="8.3"/><path d="M3.7 12h16.6M12 3.7c2.4 2.4 3.6 5.3 3.6 8.3s-1.2 5.9-3.6 8.3c-2.4-2.4-3.6-5.3-3.6-8.3S9.6 6.1 12 3.7z"/>',
    star:   '<path d="m12 3.4 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z"/>',
    cube:   '<path d="M12 2.6 3.7 7.3v9.4L12 21.4l8.3-4.7V7.3zM3.7 7.3 12 12l8.3-4.7M12 12v9.4"/>',
    target: '<circle cx="12" cy="12" r="8.3"/><circle cx="12" cy="12" r="4.4"/><circle cx="12" cy="12" r="1"/>',
    clock:  '<circle cx="12" cy="12" r="8.3"/><path d="M12 6.8v5.4l3.5 2"/>'
  };
  var LABEL = {
    bolt:'いなずま', letters:'アルファベット', maze:'めいろ', map:'ちず', flask:'フラスコ',
    book:'ほん', pen:'ペン', globe:'ちきゅう', star:'ほし', cube:'キューブ',
    target:'まと', clock:'とけい'
  };

  global.MANABI_ICONS = P;
  global.MANABI_ICON_LABELS = LABEL;
  global.manabiIcon = function (name, cls) {
    return '<svg class="' + (cls || 'ico') + '" viewBox="0 0 24 24" fill="none" '
      + 'stroke="currentColor" stroke-width="1.7" stroke-linecap="round" '
      + 'stroke-linejoin="round" aria-hidden="true">' + (P[name] || P.star) + '</svg>';
  };
})(window);
