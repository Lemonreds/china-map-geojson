/**
 *
 *  node  script:
 *  egis geojson -》 echarts geojson
 *
 *
 */
/* eslint-disable */
const json = require("./egis.json");
const fs = require("fs");

const tiandituDecodeUtil = {
  defaultOptions: function(options) {
    if (typeof options === "number") options = { precision: options };
    else options = options || {};

    options.precision = options.precision || 5;
    options.factor = options.factor || Math.pow(10, options.precision);
    options.dimension = options.dimension || 2;
    return options;
  },

  decode: function(encoded, options) {
    options = this.defaultOptions(options);

    var flatPoints = this.decodeDeltas(encoded, options),
      points = [];

    for (
      var i = 0, len = flatPoints.length;
      i + (options.dimension - 1) < len;

    ) {
      var point = [];

      for (var dim = 0; dim < options.dimension; ++dim)
        point.push(flatPoints[i++]);

      points.push(point);
    }

    return points;
  },

  decodeDeltas: function(encoded, options) {
    options = this.defaultOptions(options);

    var numbers = this.decodeFloats(encoded, options),
      lastNumbers = [];

    for (var i = 0, len = numbers.length; i < len; )
      for (var d = 0; d < options.dimension; ++d, ++i)
        numbers[i] =
          Math.round(
            (lastNumbers[d] = numbers[i] + (lastNumbers[d] || 0)) *
              options.factor
          ) / options.factor;

    return numbers;
  },

  decodeFloats: function(encoded, options) {
    options = this.defaultOptions(options);

    var numbers = this.decodeSignedIntegers(encoded);
    for (var i = 0, len = numbers.length; i < len; ++i)
      numbers[i] /= options.factor;

    return numbers;
  },

  decodeSignedIntegers: function(encoded) {
    var numbers = this.decodeUnsignedIntegers(encoded);

    for (var i = 0, len = numbers.length; i < len; ++i)
      numbers[i] = numbers[i] & 1 ? ~(numbers[i] >> 1) : numbers[i] >> 1;

    return numbers;
  },

  decodeUnsignedIntegers: function(encoded) {
    var numbers = [],
      current = 0,
      shift = 0;

    for (var i = 0, len = encoded.length; i < len; ++i) {
      var b = encoded.charCodeAt(i) - 63;

      current |= (b & 0x1f) << shift;

      if (b < 0x20) {
        numbers.push(current);
        current = 0;
        shift = 0;
      } else shift += 5;
    }

    return numbers;
  },
};

const { features } = json;

for (let item of features) {
  const {
    geometry: { coordinates },
    properties,
  } = item;
  const { lat, lng, CNAME } = properties;

  // 解析坐标
  coordinates.forEach(coors => {
    coors[0] = tiandituDecodeUtil.decode(coors[0], 5);
    //  经纬度交换
    coors.forEach(item => {
      if (Array.isArray(item)) {
        item.forEach(i => {
          let temp = i[0];
          i[0] = i[1];
          i[1] = temp;
        });
      }
    });
  });
  // 中心坐标点
  properties.cp = [lng, lat];
  // 名字简化
  properties.name = CNAME.replace(
    /中国|省|市|特别行政区|自治区|壮族自治区|回族自治区|维吾尔自治区/,
    ""
  );
}

fs.writeFile("./china.json", JSON.stringify(json), err => {
  if (err) {
    console.error(err);
  } else {
    console.log(`build ./china.json`);
  }
});
