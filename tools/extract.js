const fs = require('fs');
const path = require('path');

// 配置参数
const inputFilePath = 'group_914620769_20260408_203033.json';
const targetUin = "1040727286";
const CONTEXT_COUNT = 20; // 需要保留的前置消息数量

fs.readFile(inputFilePath, 'utf8', (err, data) => {
  if (err) {
    console.error("读取文件失败，请检查文件路径是否正确:", err);
    return;
  }

  console.log('文件读取成功，正在解析 JSON 结构...');
  try {
    const jsonData = JSON.parse(data);
    const messages = jsonData.messages;

    // 扫描并标记需要保留的索引 (使用 Set 自动去重)

    console.log(`正在扫描目标 UIN 并标记其上下文（前 ${CONTEXT_COUNT} 条）...`);
    const indicesToKeep = new Set();

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (msg.sender && msg.sender.uin === targetUin && msg.content && msg.content.text) {
        const start = Math.max(0, i - CONTEXT_COUNT);
        for (let j = start; j <= i; j++) {
          indicesToKeep.add(j);
        }
      }
    }

    console.log(`标记完毕，共有 ${indicesToKeep.size} 条记录需要处理。正在清洗并分月写入...`);


    // 按时间顺序遍历，清洗格式，并按月写入不同的文件

    // 用于存放不同月份的文件写入流
    const fileStreams = new Map();
    let writeCount = 0;
    let skipCount = 0;

    for (let i = 0; i < messages.length; i++) {
      if (indicesToKeep.has(i)) {
        const msg = messages[i];

        if (!msg.content || !msg.content.text) continue;

        let text = msg.content.text;

        // 1. 过滤 XML 
        if (text.includes("<?xml ")) {
          skipCount++;
          continue;
        }

        // 2. 抠掉所有图片和回复标签
        text = text.replace(/\[图片.*?\]/g, "");
        text = text.replace(/\[回复.*?\]/g, "");

        // 3. 换行符替换为空格
        text = text.replace(/\r?\n/g, " ");

        // 4. 清理首尾多余空格
        text = text.trim();

        // 5. 判空拦截
        if (!text) {
          skipCount++;
          continue;
        }

        // 6. 提取元数据
        const time = msg.time || "未知时间";
        const uin = msg.sender ? (msg.sender.uin || "未知UIN") : "未知UIN";
        const name = msg.sender ? (msg.sender.name || "未知昵称") : "未知昵称";

        const finalLine = `[${time}][${uin}][${name}]：${text}`;


        // 从 "2020-11-27 23:35:36" 中提取出 "2020-11"
        // 如果时间格式异常，则归入 "未知月份"
        const monthMatch = time.match(/^\d{4}-\d{2}/);
        const monthStr = monthMatch ? monthMatch[0] : "未知月份";

        // 如果这个月份的文件流还不存在，就创建一个
        if (!fileStreams.has(monthStr)) {
          const fileName = `${monthStr}.txt`; // 例如：2020-11.txt
          fileStreams.set(monthStr, fs.createWriteStream(fileName));
        }

        // 把清洗好的文本写入对应月份的文件中
        fileStreams.get(monthStr).write(finalLine + '\n');
        writeCount++;
      }
    }

    // 关闭所有打开的文件流
    for (const [month, stream] of fileStreams.entries()) {
      stream.end();
      console.log(`生成文件 -> ${month}.txt`);
    }

    console.log(`\n🎉 处理完毕！`);
    console.log(`成功提取了 ${writeCount} 条记录。`);
    console.log(`清洗过程中过滤了 ${skipCount} 条无用（纯图片/XML）记录。`);
    console.log(`已按月生成 ${fileStreams.size} 个 TXT 文件。`);

  } catch (parseErr) {
    console.error("解析 JSON 失败，文件格式可能有误:", parseErr);
  }
});