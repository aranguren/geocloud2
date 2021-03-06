<?php
namespace app\controllers;

use \app\inc\Input;
use \app\inc\Response;
use \app\conf\Connection;

class Database extends \app\inc\Controller
{
    private $db;
    private $request;

    function __construct()
    {
        $this->request = \app\inc\Input::getPath();
        $this->db = new \app\models\Database();
    }

    public function get_schemas()
    {
        return Response::json($this->db->listAllSchemas());
    }

    public function post_schemas()
    {
        return Response::json($this->db->createSchema(Input::get('schema')));
    }

    public function get_exist()
    {
        \app\models\Database::setDb("postgres");
        $this->db = new \app\models\Database();
        return Response::json($this->db->doesDbExist(Input::getPath()->part(4)));
    }
}
