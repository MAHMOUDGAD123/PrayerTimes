import fs from "fs";
import path from "path";

function getAllFiles(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const filePath = path.join(dirPath, file);
    if (fs.statSync(filePath).isDirectory()) {
      getAllFiles(filePath, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.relative("src", filePath).replaceAll("\\", "/"));
    }
  });
  return arrayOfFiles;
}

const result = getAllFiles(path.resolve("src"));
fs.writeFileSync("./src/cache.json", JSON.stringify(result));
console.log("Cache files 📁");
