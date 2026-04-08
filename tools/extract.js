const fs = require('fs');

// 配置路径和目标 UIN
const inputFilePath = 'group_498888010_20260408_202922.json';   // 原始 200MB JSON 文件名
const outputFilePath = 'output1.txt'; // 导出的 txt 文件名
const targetUin = "1040727286";

fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error("读取文件失败，请检查文件路径是否正确:", err);
    return;
  }

  console.log('文件读取成功，正在解析 JSON 结构...');
  try {
    const jsonData = JSON.parse(data);
    console.log('解析完成！正在筛选并写入 TXT...');

    // 创建一个可写流
    const writeStream = fs.createWriteStream(outputFilePath);
    let count = 0;
    let skipCount = 0; // 记录跳过了多少条无用信息

    // 遍历提取数据
    for (const msg of jsonData.messages) {
      if (msg.sender && msg.sender.uin === targetUin && msg.content && msg.content.text) {

        let text = msg.content.text;

        // 1. 遇到 XML 底层代码直接整条丢弃
        if (text.includes("<?xml ")) {
          skipCount++;
          continue;
        }

        // 2. 核心清理：抠掉所有图片和回复标签
        // /\[图片.*?\]/g 匹配 [图片] 以及 [图片: xxx.png] 等所有情况
        text = text.replace(/\[图片.*?\]/g, "");
        // /\[回复.*?\]/g 匹配 [回复 u_xxx: ] 等所有情况
        text = text.replace(/\[回复.*?\]/g, "");

        // 3. 将回车/换行符替换为空格，防止打乱 TXT 的单行结构
        text = text.replace(/\r?\n/g, " ");

        text = text.replace("[图片]", "");

        // 4. 清理首尾可能多余的空格
        text = text.trim();

        // 5. 判空拦截：如果清理掉图片和回复后，文本空了（说明原本是纯图片等），则直接跳过
        if (!text) {
          skipCount++;
          continue;
        }


        // 写入文件并自带一个换行符结尾
        writeStream.write(text + '\n');
        count++;
      }
    }

    // 关闭流并完成
    writeStream.end();

    writeStream.on('finish', () => {
      console.log(`\n🎉 处理完毕！`);
      console.log(`成功提取了 ${count} 条记录，过滤跳过了 ${skipCount} 条无用记录。`);
      console.log(`已保存至同一目录下的 ${outputFilePath}`);
    });

  } catch (parseErr) {
    console.error("解析 JSON 失败，文件格式可能有误:", parseErr);
  }
});