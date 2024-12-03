import { Client } from 'pg';
import inquirer from 'inquirer';

interface Department {
    id: number;
    name: string;
}

interface Role {
    id: number;
    title: string;
    salary: number;
    department_id: number;
}

interface Employee {
    id: number;
    first_name: string;
    last_name: string;
    role_id: number;

}

const client = new Client({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres',
    password: 'MyNameElmo123',
    port: 5432,
});

client.connect().then(() => {
    console.log('Connected to the database successfully');
}).catch(err => {
    console.error('Connection error', err.stack);
});

const mainMenu = async (): Promise<void> => {
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'What would you like to do?',
            choices: [
                'View all departments',
                'View all roles',
                'View all employees',
                'Add a department',
                'Add a role',
                'Add an employee',
                'Update an employee role',
                'Exit'
            ]
        }
    ]);

    switch (choice) {
        case 'View all departments':
            viewAllDepartments();
            break;
        case 'View all roles':
            viewAllRoles();
            break;
        case 'View all employees':
            viewAllEmployees();
            break;
        case 'Add a department':
            addDepartment();
            break;
        case 'Add a role':
            addRole();
            break;
        case 'Add an employee':
            addEmployee();
            break;
        case 'Update an employee role':
            updateEmployeeRole();
            break;
        default:
            client.end();
            process.exit();
    }
};

const viewAllDepartments = async (): Promise<void> => {
    try {
        const res = await client.query<Department>('SELECT * FROM department');
        console.table(res.rows);
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

const viewAllRoles = async (): Promise<void> => {
    try {
        const res = await client.query<Role & { department: string }>(
            'SELECT role.id, role.title, role.salary, department.name AS department FROM role JOIN department ON role.department_id = department.id'
        );
        console.table(res.rows);
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

const viewAllEmployees = async (): Promise<void> => {
    try {
        const res = await client.query<Employee & { title: string, department: string, salary: number }>(
            `SELECT 
        employee.id, 
        employee.first_name, 
        employee.last_name, 
        role.title, 
        department.name AS department, 
        role.salary
        
      FROM employee 
      JOIN role ON employee.role_id = role.id 
      JOIN department ON role.department_id = department.id `

        );
        if (res.rows.length > 0) {
            console.table(res.rows);
        }
        else {
            console.log('No employees found');
        }
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

const addDepartment = async (): Promise<void> => {
    const { name } = await inquirer.prompt<{ name: string }>([
        { name: 'name', message: 'Enter the name of the department:' }
    ]);
    try {
        await client.query('INSERT INTO department (name) VALUES ($1)', [name]);
        console.log(`Department ${name} added!`);
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

const addRole = async (): Promise<void> => {
    try {
        const departments = await client.query<Department>('SELECT * FROM department');
        const { title, salary, department_id } = await inquirer.prompt<{ title: string, salary: number, department_id: number }>([
            { name: 'title', message: 'Enter the title of the role:' },
            { name: 'salary', message: 'Enter the salary for the role:' },
            {
                type: 'list',
                name: 'department_id',
                message: 'Select the department for the role:',
                choices: departments.rows.map((d: Department) => ({ name: d.name, value: d.id }))
            }
        ]);
        await client.query('INSERT INTO role (title, salary, department_id) VALUES ($1, $2, $3)', [title, salary, department_id]);
        console.log(`Role ${title} added!`);
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

const addEmployee = async (): Promise<void> => {
    try {
        const roles = await client.query<Role>('SELECT * FROM role');
        const employees = await client.query<Employee>('SELECT * FROM employee');
        const { first_name, last_name, role_id } = await inquirer.prompt<{ first_name: string, last_name: string, role_id: number }>([
            { name: 'first_name', message: 'Enter the first name of the employee:' },
            { name: 'last_name', message: 'Enter the last name of the employee:' },
            {
                type: 'list',
                name: 'role_id',
                message: 'Select the role of the employee:',
                choices: roles.rows.map((r: Role) => ({ name: r.title, value: r.id }))
            },

        ]);
        await client.query('INSERT INTO employee (first_name, last_name, role_id) VALUES ($1, $2, $3)', [first_name, last_name, role_id,]);
        console.log(`Employee ${first_name} ${last_name} added!`);
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

const updateEmployeeRole = async (): Promise<void> => {
    try {
        const employees = await client.query<Employee>('SELECT * FROM employee');
        const roles = await client.query<Role>('SELECT * FROM role');
        const { employee_id, role_id } = await inquirer.prompt<{ employee_id: number, role_id: number }>([
            {
                type: 'list',
                name: 'employee_id',
                message: 'Select the employee to update:',
                choices: employees.rows.map((e: Employee) => ({ name: `${e.first_name} ${e.last_name}`, value: e.id }))
            },
            {
                type: 'list',
                name: 'role_id',
                message: 'Select the new role of the employee:',
                choices: roles.rows.map((r: Role) => ({ name: r.title, value: r.id }))
            }
        ]);
        await client.query('UPDATE employee SET role_id = $1 WHERE id = $2', [role_id, employee_id]);
        console.log(`Employee role updated!`);
    } catch (err) {
        console.error('Error executing query', err);
    }
    mainMenu();
};

mainMenu();
