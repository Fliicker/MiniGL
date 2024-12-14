import m3 from "./matrix3.js";
import m4 from "./matrix4.js";
import axios from "axios";
import * as turf from "@turf/turf";

let canvas = document.getElementById("c");
/** @type {WebGL2RenderingContext} */
const gl = canvas.getContext("webgl2");

const main = async () => {
  const geojson = (await axios.get('/geojson/China.json')).data;
  console.log(geojson)
  turf.featureEach(geojson, (polygon) => {
    const array = polygonToArray(polygon);
  })

}

function polygonToArray(polygon) {
  let array = [];
  let triangles = turf.tesselate(polygon)
  turf.flattenEach(triangles, (triangle) => {
    array.push(triangle.geometry.coordinates[0])
    console.log(triangle)
  })
  return array
}

function convertToMercator() {

}

main()