create table lists(
	id serial primary key,
	title varchar(50) not null unique);


create table tasks(
id serial primary key,
title varchar(50) not null,
deadline timestamptz not null,
description varchar(250),
priority varchar(50),
list_id integer references lists(id));

insert into lists(title) values('Today'),('Upcoming');