#!/usr/bin/env node
import fs from 'node:fs';
import {exec, execSync} from 'node:child_process';
import {program} from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ping from 'node-http-ping';
import registries from '../registries.json' assert { type : 'json' };

let json = fs.readFileSync('../package.json', 'utf-8');
json = JSON.parse(json);
// console.log(json);
// console.log(json.version);

program.version(json.version);

program
  .option('-a, --numberA <value>', 'First number');

const getOrigin = async () => {
    return await execSync('npm get registry', { encoding: "utf-8" })
}

program.command('ls').description('查看镜像列表').action(async () => {
    const res = await getOrigin();

    const keys = Object.keys(registries);
    const message = [];

    const max = Math.max(...keys.map(item => item.length)) + 3;

    keys.forEach(item => {
        const newK = registries[item].registry === res.trim() ? ('* ' + item) : ('  ' + item);
        const arr = new Array(...newK);
        arr.length = max;
        const prefix = Array.from(arr).map(item => item ? item : '-').join('');
        message.push(prefix + '  ' + registries[item].registry);
    })
    console.log(message.join('\n'));
})

program.command('use').description('选择npm镜像').action(async () => {
    inquirer.prompt([  
	    {
            type: 'list',
            name: 'npm-select',
            message: '请选择你要使用的npm镜像',
            choices: Object.keys(registries)
        }  
	]).then(answers => {  
	    console.log(answers); 
        const npmRegisty = registries[answers['npm-select']].registry;
        console.log(npmRegisty);

        exec(`npm config set registry ${npmRegisty}`, null, (err, stdout, stderr) => {
            if (err) {
                console.log('切换npm源失败' + err);
            }
            else {
                console.log('切换npm源成功');
            }
        })
	});
})

// 查看当前npm源
program.command('current').description('查看当前npm所使用的源').action(async () => {
    const res = await getOrigin();
    let data = null;
    Object.keys(registries).forEach((item) => {
        if (registries[item].registry === res.trim()) {
            data = item;
        }
    })
    if (data) {
        console.log(chalk.blue('当前源: ' + data));   
    }
    else {
        console.log(chalk.green('当前源: ' + res));
    }
})

// 测试当前镜像源的速度
program.command('ping').description('测试当前镜像源的速度').action(async () => {
    inquirer.prompt([  
	    {
            type: 'list',
            name: 'ping-select',
            message: '请选择你要测试的npm镜像源',
            choices: Object.keys(registries)
        }  
	]).then(answers => {  
        const registry = registries[answers['ping-select']].ping.trim();

        ping(registry)
            .then(time => console.log(chalk.green(`Response time: ${time}ms`)))
            .catch(() => console.log(chalk.red(`Failed to ping ${registry}`)))
	});
})

// 自定义增加npm镜像源
program.command('add').description('自定义增加npm镜像源').action(async () => {
    inquirer.prompt([
        {
            type: 'input',
            name: 'name',
            message: '请输入你要添加的npm镜像源名字：',
            validate(answer) {
                const keys = Object.keys(registries)
                if (keys.includes(answer)) {
                    return `不能起名${answer}跟保留字冲突`
                }
                if (!answer.trim()) {
                    return '名称不能为空'
                }
                return true
            }
        },
        {
            type: 'input',
            name: 'url',
            message: '请输入你要添加的npm镜像源地址：',
            validate(answer) {
                if (!answer.trim()) {
                    return 'url地址不能为空'
                }
                return true
            }
        }
    ]).then((result) => {
        console.log(result);
        const {name = '', url = ''} = result;

        const del = (url) => {
            const temp = url.split('');
            if (temp && temp.length !== 0 && temp[temp.length - 1] === '/') {
                temp.pop();
                return temp.join('');
            }
            else {
                return temp.join('');
            }
        };

        console.log(name);
        registries[name] = {
            home: url.trim(),
            registry: url.trim(),
            ping: del(url.trim())
        }
        
    })
})

program.parse();
console.log(program.opts());